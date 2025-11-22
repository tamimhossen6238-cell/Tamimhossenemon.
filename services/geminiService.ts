import { GoogleGenAI } from "@google/genai";
import { QuizConfig } from "../types";

// A robust, fixed HTML template that we know works perfectly.
// We only inject data into this, preventing AI from breaking the code structure.
const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Smart Quiz Generator</title>
    <style>
        #loader { position: fixed; top:0; left:0; width:100%; height:100%; background:#fff; z-index:9999; display:flex; justify-content:center; items-center:center; transition: opacity 0.5s; }
        .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #6366f1; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: { bn: ['"Hind Siliguri"', 'sans-serif'], en: ['"Inter"', 'sans-serif'] },
                    animation: { 'fade-in': 'fadeIn 0.3s ease-out forwards' },
                    keyframes: { fadeIn: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } } }
                }
            }
        }
        window.MathJax = {
            tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']] },
            svg: { fontCache: 'global', scale: 1.0 },
            options: { enableMenu: false },
            startup: { typeset: false }
        };
    </script>
    <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js" async></script>
    <style>
        body { font-family: 'Hind Siliguri', sans-serif; background: #f1f5f9; -webkit-tap-highlight-color: transparent; }
        .graph-box svg { max-height: 140px; width: auto; margin: 0 auto; display: block; }
        .opt-btn.selected { background: #eff6ff; border-color: #6366f1; color: #4338ca; box-shadow: 0 0 0 1px #6366f1; }
        .opt-btn.disabled { opacity: 0.6; pointer-events: none; }
        .filter-btn.active { transform: scale(0.98); ring: 2px; }
        mjx-container { outline: none; display: inline-grid !important; vertical-align: middle !important; margin: 0 1px !important; }
        mjx-container svg { display: block; }
    </style>
</head>
<body class="h-screen flex flex-col overflow-hidden text-slate-800">
    <div id="loader"><div class="spinner"></div></div>
    <div id="app" class="flex-1 flex flex-col h-full relative opacity-0 transition-opacity duration-500"></div>
    <script>
        // --- DYNAMIC DATA ---
        const SVG_GRAPHS = __GRAPHS_PLACEHOLDER__;
        const QUIZ_DATA = __DATA_PLACEHOLDER__;
        
        // --- LOGIC ---
        let state = { activeQ: QUIZ_DATA, answers: new Array(QUIZ_DATA.length).fill(null), timer: QUIZ_DATA.length * 45, filter: 'all' };
        let timerInt;
        const app = document.getElementById('app');
        const loader = document.getElementById('loader');

        function init() {
            state.activeQ = QUIZ_DATA; 
            state.answers = new Array(state.activeQ.length).fill(null);
            state.timer = state.activeQ.length * 45;
            state.filter = 'all';
            setTimeout(() => {
                loader.style.opacity = '0';
                app.classList.remove('opacity-0');
                setTimeout(() => loader.remove(), 500);
            }, 500);
            renderQuiz();
            startTimer();
        }

        function startTimer() {
            if(timerInt) clearInterval(timerInt);
            timerInt = setInterval(() => {
                state.timer--;
                const m = Math.floor(state.timer/60), s = state.timer%60;
                const tEl = document.getElementById('timer');
                if(tEl) tEl.innerText = \`\${m}:\${s.toString().padStart(2,'0')}\`;
                if(state.timer<=0) finish(true);
            }, 1000);
        }

        function handle(qI, oI) {
            if(state.answers[qI] !== null) return;
            state.answers[qI] = oI;
            document.getElementById(\`b-\${qI}-\${oI}\`).classList.add('selected');
            document.querySelectorAll(\`#c-\${qI} .opt-btn\`).forEach(b => b.classList.add('disabled'));
            document.getElementById('count').innerText = state.answers.filter(a=>a!==null).length;
        }

        function finish(force = false) {
            if (!force) {
                let isSure = confirm("আপনি কি নিশ্চিত যে আপনি পরীক্ষা শেষ করতে চান?");
                if (!isSure) return;
            }
            clearInterval(timerInt);
            renderResult();
        }

        function setFilter(f) {
            state.filter = f;
            renderResult();
        }

        function renderQuiz() {
            app.innerHTML = \`
                <div class="bg-white h-14 flex items-center justify-between px-4 border-b sticky top-0 z-20 shadow-sm">
                    <span class="font-bold text-slate-700 text-sm">প্রশ্ন: <span id="count" class="text-indigo-600">0</span>/\${state.activeQ.length}</span>
                    <span id="timer" class="bg-indigo-50 px-3 py-1 rounded-lg text-indigo-700 font-mono font-bold text-sm border border-indigo-100">\${Math.floor(state.timer/60)}:\${(state.timer%60).toString().padStart(2,'0')}</span>
                </div>
                <div class="flex-1 overflow-y-auto p-4 space-y-4 pb-20 bg-slate-50">
                    \${state.activeQ.map((q,i) => \`
                        <div id="c-\${i}" class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 animate-fade-in" style="animation-delay:\${i*0.05}s">
                            <div class="flex gap-3 mb-3">
                                <span class="bg-slate-100 text-slate-500 h-6 w-6 rounded flex items-center justify-center text-xs font-bold shrink-0 mt-1">\${i+1}</span>
                                <div class="w-full min-w-0">
                                    \${q.graphSVG && SVG_GRAPHS[q.graphSVG] ? \`<div class="graph-box mb-3 bg-white rounded-lg border border-slate-100 p-2 shadow-sm">\${SVG_GRAPHS[q.graphSVG]}</div>\` : ''}
                                    <h3 class="text-[15px] font-semibold text-slate-800 leading-normal">\${q.q}</h3>
                                </div>
                            </div>
                            <div class="grid gap-2">
                                \${q.options.map((o,oi) => \`<button id="b-\${i}-\${oi}" onclick="handle(\${i},\${oi})" class="opt-btn w-full text-left px-4 py-3 rounded-xl border border-slate-200 text-slate-600 text-[14px] flex gap-3 items-center hover:bg-slate-50 transition active:scale-[0.99]"><span class="font-bold text-slate-400 text-xs w-5 h-5 rounded-full border flex items-center justify-center shrink-0">\${String.fromCharCode(65+oi)}</span><span>\${o}</span></button>\`).join('')}
                            </div>
                        </div>
                    \`).join('')}
                </div>
                <div class="p-4 bg-white border-t sticky bottom-0 z-20"><button onclick="finish()" class="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition text-sm uppercase tracking-wide">ফলাফল দেখুন</button></div>
            \`;
            setTimeout(() => { if(window.MathJax) window.MathJax.typesetPromise(); }, 10);
        }

        function renderResult() {
            let c = 0, w = 0, s = 0;
            state.answers.forEach((a,i) => a===null ? s++ : (a===state.activeQ[i].answer ? c++ : w++));
            
            // INJECTED SCORE LOGIC
            __SCORE_LOGIC__
            
            let acc = state.activeQ.length > 0 ? Math.round((score/state.activeQ.length)*100) : 0;
            if(acc < 0) acc = 0;
            
            const visibleIndices = state.activeQ.map((_,i)=>i).filter(i => {
                if(state.filter === 'correct') return state.answers[i] === state.activeQ[i].answer;
                if(state.filter === 'incorrect') return state.answers[i] !== null && state.answers[i] !== state.activeQ[i].answer;
                if(state.filter === 'skipped') return state.answers[i] === null;
                return true;
            });

            app.innerHTML = \`
                <div class="flex-1 overflow-y-auto bg-slate-50 pb-6">
                    <div class="bg-white pt-6 pb-8 rounded-b-[2rem] shadow-sm px-4 mb-6 border-b border-slate-200">
                        <div class="flex justify-center gap-8 mb-6 items-center">
                            <div class="text-center"><div class="text-4xl font-extrabold text-slate-800 font-en">\${score.toFixed(2).replace(/[.,]00$/, "")}</div><div class="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Score</div></div>
                            <div class="w-px h-10 bg-slate-200"></div>
                            <div class="text-center"><div class="text-4xl font-extrabold font-en \${acc>=80?'text-emerald-500':acc>=50?'text-amber-500':'text-red-500'}">\${acc}%</div><div class="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Accuracy</div></div>
                        </div>
                        <div class="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                            <button onclick="setFilter('correct')" class="filter-btn \${state.filter==='correct'?'ring-2 ring-emerald-500 bg-emerald-50':''} bg-white border border-slate-200 rounded-2xl p-2.5 flex flex-col items-center shadow-sm hover:bg-emerald-50 transition active:scale-95">
                                <span class="text-xl font-bold text-emerald-600 font-en">\${c}</span><span class="text-[9px] uppercase text-emerald-600 font-bold">সঠিক</span>
                            </button>
                            <button onclick="setFilter('incorrect')" class="filter-btn \${state.filter==='incorrect'?'ring-2 ring-red-500 bg-red-50':''} bg-white border border-slate-200 rounded-2xl p-2.5 flex flex-col items-center shadow-sm hover:bg-red-50 transition active:scale-95">
                                <span class="text-xl font-bold text-red-500 font-en">\${w}</span><span class="text-[9px] uppercase text-red-500 font-bold">ভুল</span>
                            </button>
                            <button onclick="setFilter('skipped')" class="filter-btn \${state.filter==='skipped'?'ring-2 ring-amber-500 bg-amber-50':''} bg-white border border-slate-200 rounded-2xl p-2.5 flex flex-col items-center shadow-sm hover:bg-amber-50 transition active:scale-95">
                                <span class="text-xl font-bold text-amber-500 font-en">\${s}</span><span class="text-[9px] uppercase text-amber-500 font-bold">স্কিপ</span>
                            </button>
                        </div>
                        \${state.filter !== 'all' ? \`<button onclick="setFilter('all')" class="mt-5 text-xs text-indigo-600 font-bold flex items-center justify-center gap-1 mx-auto bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 transition"><i class="fas fa-sync-alt"></i> সব প্রশ্ন দেখুন</button>\` : ''}
                    </div>
                    <div class="px-4 space-y-4 max-w-3xl mx-auto">
                        \${visibleIndices.length === 0 ? \`<div class="text-center text-slate-400 py-12 font-medium bg-white rounded-2xl border border-slate-100 mx-4">এই ফিল্টারে কোনো প্রশ্ন নেই</div>\` : ''}
                        \${visibleIndices.map(i => {
                            const q = state.activeQ[i], uA = state.answers[i];
                            const isC = uA===q.answer, isS = uA===null;
                            const color = isC ? 'emerald' : (isS ? 'amber' : 'red');
                            const icon = isC ? 'check' : (isS ? 'minus' : 'times');
                            return \`
                                <div class="bg-white rounded-2xl border border-\${color}-200 shadow-sm overflow-hidden">
                                    <div class="p-3 bg-\${color}-50/50 flex justify-between items-center border-b border-\${color}-100">
                                        <span class="text-xs font-bold text-\${color}-700 bg-\${color}-100 px-2 py-0.5 rounded">Q\${i+1}</span>
                                        <span class="text-[10px] font-bold uppercase text-\${color}-700 flex items-center gap-1"><i class="fas fa-\${icon}"></i> \${isC?'সঠিক':(isS?'স্কিপড':'ভুল')}</span>
                                    </div>
                                    <div class="p-4">
                                        \${q.graphSVG && SVG_GRAPHS[q.graphSVG] ? \`<div class="w-full mb-3 flex justify-center">\${SVG_GRAPHS[q.graphSVG]}</div>\` : ''}
                                        <h3 class="font-semibold text-slate-800 mb-3 text-[15px] leading-normal">\${q.q}</h3>
                                        <div class="flex flex-wrap gap-2 mb-4">
                                            \${q.options.map((o,oi) => {
                                                let st = "bg-slate-50 text-slate-500 border-slate-200";
                                                if(oi===q.answer) st="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold ring-1 ring-emerald-200";
                                                else if(oi===uA && !isC) st="bg-red-50 text-red-600 border-red-200 line-through decoration-red-400";
                                                return \`<span class="text-xs px-2.5 py-1.5 rounded border \${st}">\${o}</span>\`
                                            }).join('')}
                                        </div>
                                        <div class="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                            <div class="p-3 text-sm text-slate-600 leading-relaxed border-b border-slate-100"><strong class="text-slate-400 text-[10px] uppercase block mb-1"><i class="fas fa-info-circle"></i> ব্যাখ্যা</strong>\${q.expl}</div>
                                            \${q.shortcut ? \`<div class="bg-emerald-50/50 p-3"><div class="flex items-start gap-2"><span class="text-emerald-600 text-xs mt-0.5"><i class="fas fa-bolt"></i></span><div><strong class="text-emerald-700 text-[10px] uppercase block mb-0.5">শর্টকাট</strong><span class="text-sm text-slate-700 font-medium">\${q.shortcut}</span></div></div></div>\` : ''}
                                        </div>
                                    </div>
                                </div>
                            \`
                        }).join('')}
                    </div>
                    <div class="p-6 text-center mt-4">
                        <button onclick="init()" class="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition flex items-center gap-2 mx-auto"><i class="fas fa-redo"></i> নতুন পরীক্ষা দিন</button>
                    </div>
                </div>
            \`;
            setTimeout(() => { if(window.MathJax) window.MathJax.typesetPromise(); }, 10);
        }
        window.onload = init;
    </script>
</body>
</html>
`;

export const generateQuizCode = async (config: QuizConfig): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API Key missing");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const PROMPT = `
### ROLE:
You are an API that outputs strictly valid JSON. 
Task: Generate a quiz content JSON object based on the user request.

### REQUEST DETAILS:
- **Topic:** ${config.topic}
- **Subject:** ${config.subject}
- **Standard:** ${config.standard}
- **Count:** ${config.questions}
- **Extra:** ${config.others || "None"}

### OUTPUT SCHEMA (JSON ONLY):
{
  "questions": [
    {
      "q": "Question text with $latex$ equations",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0, // Index of correct option (0-3)
      "expl": "Explanation in Bengali",
      "shortcut": "Memory tip in Bengali",
      "graphSVG": "key_name_if_graph_needed" // Optional, matches keys in 'graphs' object
    }
  ],
  "graphs": {
    "key_name": "<svg ...> ... </svg>" // Inline SVG string for any graphs used
  }
}

### RULES:
1. Language: Bengali (Bangla).
2. Math: Use standard LaTeX with single backslashes (e.g. $\\theta$). Do NOT use double backslashes in the JSON string values unless escaping a quote.
3. Generate ${config.questions} questions.
4. Provide clear explanations and shortcuts.
5. Include 2-3 graph questions if relevant to the topic.
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: PROMPT,
    });

    let text = response.text.trim();
    if (text.startsWith('```json')) {
        text = text.replace(/^```json/, '').replace(/```$/, '');
    } else if (text.startsWith('```')) {
         text = text.replace(/^```/, '').replace(/```$/, '');
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch(e) {
        throw new Error("Failed to parse AI response. Please try again.");
    }

    // Prepare Injection Strings
    const graphsJson = JSON.stringify(data.graphs || {});
    const quizDataJson = JSON.stringify(data.questions || []);
    
    let scoreLogic = "let score = c;";
    if (config.negativeMarking) {
        scoreLogic = "let score = c - (w * 0.25); if(score < 0) score = 0;";
    }

    // Inject into Template
    let finalHtml = HTML_TEMPLATE
        .replace('__GRAPHS_PLACEHOLDER__', graphsJson)
        .replace('__DATA_PLACEHOLDER__', quizDataJson)
        .replace('__SCORE_LOGIC__', scoreLogic);

    return finalHtml;
};