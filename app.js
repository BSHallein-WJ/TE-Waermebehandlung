const originalQuestions = window.questionsData || [];

let questions = [];
let currentIndex = 0;
let quizActive = false;
let questionOrder = "sequential";
let selectedCategory = "Wärmebehandlung";
const lastStartedQuestionByCategory = {};

const startScreen = document.getElementById("start-screen");
const categoryTitle = document.getElementById("category-title");
const quizScreen = document.getElementById("quiz-screen");
const footerButtons = document.getElementById("footer-buttons");
const progressEl = document.getElementById("progress");
const progressWrapper = document.getElementById("progress-wrapper");
const progressBarFill = document.getElementById("progress-bar-fill");
const categoryButtons = document.getElementById("category-buttons");

const questionEl = document.getElementById("question");
const levelIndicatorEl = document.getElementById("level-indicator");
const questionTextEl = document.getElementById("question-text");
const questionImagesEl = document.getElementById("question-images");
const solutionBox = document.getElementById("solution-box");
const solutionAnswerEl = document.getElementById("solution-answer");
const solutionImagesEl = document.getElementById("solution-images");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");

const imageViewer = document.getElementById("image-viewer");
const viewerImage = document.getElementById("viewer-image");

const categories = [...new Set(originalQuestions.map(question => question.category).filter(Boolean))];
categories.forEach(category => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn-start";
    button.innerText = `${category} (${originalQuestions.filter(question => question.category === category).length})`;
    button.addEventListener("click", () => startQuiz(category));
    categoryButtons.appendChild(button);
});

const savedDarkMode = localStorage.getItem("darkMode") === "true";
if (savedDarkMode) {
    document.body.classList.add("dark-mode");
    document.getElementById("dark-mode-button").innerText = "Hellmodus";
}

updateOrderToggleButton();

function renderImages(container, imgList) {
    if (imgList && imgList.length > 0) {
        container.innerHTML = imgList.map(src =>
            `<img src="${src.trim()}" alt="" class="zoomable-image" style="max-width:100%; border-radius:6px; margin-top:14px; display:block; margin-left:auto; margin-right:auto;">`
        ).join("");
        container.style.display = container === solutionImagesEl ? "flex" : "block";

        container.querySelectorAll(".zoomable-image").forEach(image => {
            image.addEventListener("click", event => {
                event.stopPropagation();
                viewerImage.src = image.src;
                imageViewer.style.display = "flex";
                imageViewer.setAttribute("aria-hidden", "false");
            });
        });
    } else {
        container.innerHTML = "";
        container.style.display = "none";
    }
}

function closeImageViewer() {
    imageViewer.style.display = "none";
    imageViewer.setAttribute("aria-hidden", "true");
    viewerImage.src = "";
}

imageViewer.addEventListener("click", closeImageViewer);

function shuffleQuestions(array) {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function startQuiz(category) {
    selectedCategory = category;
    categoryTitle.innerText = category;
    const categorizedQuestions = originalQuestions.filter(question => question.category === selectedCategory);
    questions = questionOrder === "mixed" ? shuffleQuestions(categorizedQuestions) : [...categorizedQuestions];

    if (questionOrder === "mixed" && questions.length > 1) {
        const lastStartedQuestion = lastStartedQuestionByCategory[category];
        const lastQuestionIndex = questions.findIndex(question => question.frage === lastStartedQuestion);

        if (lastQuestionIndex === 0) {
            [questions[0], questions[1]] = [questions[1], questions[0]];
        } else if (lastQuestionIndex > 0) {
            [questions[0], questions[lastQuestionIndex]] = [questions[lastQuestionIndex], questions[0]];
        }
    }

    if (questions.length > 0) {
        lastStartedQuestionByCategory[category] = questions[0].frage;
    }
    currentIndex = 0;
    quizActive = true;

    startScreen.style.display = "none";
    quizScreen.style.display = "block";
    footerButtons.style.display = "flex";
    progressWrapper.style.display = "flex";

    loadQuestion();
}

function setQuestionOrder(order) {
    questionOrder = order;
    updateOrderToggleButton();
    goToStart();
}

function toggleQuestionOrder() {
    setQuestionOrder(questionOrder === "sequential" ? "mixed" : "sequential");
}

function updateOrderToggleButton() {
    const button = document.getElementById("order-toggle-button");
    button.innerText = questionOrder === "mixed" ? "Modus: Gemischt" : "Modus: Sortiert";
    button.setAttribute("aria-label", `Reihenfolge wechseln: ${button.innerText}`);
    button.title = `Reihenfolge wechseln: ${button.innerText}`;
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\n/g, "<br>");
}

function renderBold(text) {
    return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function renderSolution(question) {
    const sections = [`<strong>${renderBold(question.antwort)}</strong>`];

    if (question.erklaerung) {
        sections.push(`<strong><em><u>Erklärung:</u></em></strong><br>${renderBold(question.erklaerung)}`);
    }
    if (question.beispiel) {
        sections.push(`<strong><em><u>Beispiel:</u></em></strong><br>${renderBold(question.beispiel)}`);
    }
    if (question.beispiel_2) {
        sections.push(`<strong><em><u>Weiteres Beispiel:</u></em></strong><br>${renderBold(question.beispiel_2)}`);
    }

    return sections.join("<br><br>");
}

function loadQuestion() {
    const q = questions[currentIndex];
    const level = (q.level || "").toUpperCase();
    levelIndicatorEl.innerHTML = [
        level.includes("N") ? '<span class="level-dot level-n" title="Normales Wissensniveau"></span>' : "",
        level.includes("V") ? '<span class="level-dot level-v" title="Erhöhtes Wissensniveau"></span>' : ""
    ].join("");
    levelIndicatorEl.setAttribute("aria-label", level === "NV" ? "Normales und erhöhtes Wissensniveau" :
        level === "N" ? "Normales Wissensniveau" :
            level === "V" ? "Erhöhtes Wissensniveau" : "Kein Wissensniveau zugeordnet");
    questionTextEl.innerHTML = renderBold(q.frage);
    renderImages(questionImagesEl, [
        ...(q.fragebild || []),
        ...(q.fragebild_2 || [])
    ]);

    solutionAnswerEl.innerHTML = renderSolution(q);
    renderImages(solutionImagesEl, [
        ...(q.beispiel_bild || []),
        ...(q.beispiel_bild_2 || [])
    ]);

    solutionBox.style.display = "none";
    progressEl.innerText = `Frage ${currentIndex + 1} von ${questions.length}`;
    progressBarFill.style.width = `${((currentIndex + 1) / questions.length) * 100}%`;

    btnPrev.disabled = questions.length <= 1;
    btnNext.innerText = currentIndex === questions.length - 1 ? "Beenden" : "Weiter";
    btnNext.setAttribute("aria-label", currentIndex === questions.length - 1 ? "Quiz beenden" : "Nächste Frage");
    btnNext.disabled = false;
}

function toggleSolution() {
    if (!quizActive) return;
    solutionBox.style.display = (solutionBox.style.display === "block") ? "none" : "block";
}

function nextQuestion() {
    if (!quizActive) return;
    if (currentIndex === questions.length - 1) {
        goToStart();
        return;
    }
    if (currentIndex < questions.length - 1) {
        currentIndex++;
        loadQuestion();
    }
}

function prevQuestion() {
    if (quizActive && questions.length > 1) {
        currentIndex = currentIndex === 0 ? questions.length - 1 : currentIndex - 1;
        loadQuestion();
    }
}

function goToStart() {
    quizActive = false;
    categoryTitle.innerText = "Wärmebehandlung von Stahl";
    startScreen.style.display = "flex";
    quizScreen.style.display = "none";
    footerButtons.style.display = "none";
    progressWrapper.style.display = "none";
    document.getElementById("menu-dropdown").style.display = "none";
}

function closeApp() {
    window.close();
    goToStart();
}

function toggleDarkMode() {
    const darkModeEnabled = document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", darkModeEnabled);
    document.getElementById("dark-mode-button").innerText = darkModeEnabled ? "Hellmodus" : "Darkmode";
    document.getElementById("menu-dropdown").style.display = "none";
}

function toggleMenu() {
    const dropdown = document.getElementById("menu-dropdown");
    dropdown.style.display = (dropdown.style.display === "block") ? "none" : "block";
}

function openLegalModal() {
    document.getElementById("legal-modal").style.display = "block";
    document.getElementById("menu-dropdown").style.display = "none";
}

function closeLegalModal() {
    document.getElementById("legal-modal").style.display = "none";
}

window.onclick = function (event) {
    if (!event.target.matches('.btn-burger')) {
        document.getElementById("menu-dropdown").style.display = "none";
    }
};

document.addEventListener('keydown', function (e) {
    if (e.key === "Escape" && imageViewer.style.display === "flex") {
        closeImageViewer();
        return;
    }
    if (!quizActive) {
        if (e.key === "Enter" || e.key === " ") startQuiz(selectedCategory);
        return;
    }
    if (e.key === "ArrowRight") nextQuestion();
    if (e.key === "ArrowLeft") prevQuestion();
    if (e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        toggleSolution();
    }
});
