import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, User } from 'firebase/auth';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { generateQuizCode } from './services/geminiService';
import { Project, QuizConfig } from './types';

// --- COMPONENTS ---

const AuthView = ({ onLogin }: { onLogin: () => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confPass, setConfPass] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, pass);
      } else {
        if (pass !== confPass) throw new Error("Passwords do not match");
        if (pass.length < 6) throw new Error("Password too short");
        await createUserWithEmailAndPassword(auth, email, pass);
      }
      onLogin();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-surface-2 px-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-[28px] w-full max-w-[350px] text-center shadow-2xl border border-border">
        <i className="fas fa-code text-5xl text-accent mb-4"></i>
        <h2 className="text-2xl font-bold mb-1 text-text">Coding Hub</h2>
        <p className="text-sub mb-6 text-sm">Ultra Pro</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input 
            className="w-full p-4 rounded-xl bg-surface border border-border text-text outline-none focus:border-accent transition"
            placeholder="Email Address" 
            type="email" 
            value={email} onChange={e => setEmail(e.target.value)} 
            required 
          />
          <input 
            className="w-full p-4 rounded-xl bg-surface border border-border text-text outline-none focus:border-accent transition"
            placeholder="Password" 
            type="password" 
            value={pass} onChange={e => setPass(e.target.value)} 
            required 
          />
          {!isLogin && (
            <input 
              className="w-full p-4 rounded-xl bg-surface border border-border text-text outline-none focus:border-accent transition"
              placeholder="Confirm Password" 
              type="password" 
              value={confPass} onChange={e => setConfPass(e.target.value)} 
              required 
            />
          )}
          {isLogin && (
            <div className="text-right text-xs text-accent cursor-pointer hover:underline" onClick={() => { if(email) sendPasswordResetEmail(auth, email).then(()=>alert('Sent')).catch(e=>alert(e.message)); else alert('Enter email first'); }}>
              Forgot Password?
            </div>
          )}
          <button type="submit" className="w-full p-4 rounded-xl bg-text text-bg font-bold mt-2 hover:opacity-90 transition disabled:opacity-50" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>
        <div className="mt-6 text-sm text-sub cursor-pointer hover:text-text transition" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Create Account' : 'Back to Login'}
        </div>
      </div>
    </div>
  );
};

const NewProjectModal = ({ isOpen, onClose, onCreate }: { isOpen: boolean, onClose: () => void, onCreate: (config: QuizConfig) => void }) => {
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [standard, setStandard] = useState('');
  const [questions, setQuestions] = useState(20);
  const [others, setOthers] = useState('');
  const [negativeMarking, setNegativeMarking] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 transition-opacity duration-300">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl transform transition-all scale-100">
        <div className="bg-accent/10 p-6 border-b border-border">
          <h3 className="text-xl font-bold text-accent">Generate Quiz</h3>
          <p className="text-xs text-sub mt-1">Powered by Gemini AI</p>
        </div>
        
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            
            {/* Subject */}
            <div className="space-y-1">
                <label className="text-xs font-bold text-sub uppercase">Subject Name</label>
                <input className="w-full p-3 rounded-lg bg-surface border border-border text-sm text-text focus:border-accent outline-none" placeholder="e.g. Physics" value={subject} onChange={e=>setSubject(e.target.value)} />
            </div>

            {/* Topic */}
            <div className="space-y-1">
                <label className="text-xs font-bold text-sub uppercase">Chapter / Topic</label>
                <input className="w-full p-3 rounded-lg bg-surface border border-border text-sm text-text focus:border-accent outline-none" placeholder="e.g. Vector" value={topic} onChange={e=>setTopic(e.target.value)} />
            </div>

            {/* Standard & Questions Side-by-Side */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-sub uppercase">Standard/Class</label>
                    <input className="w-full p-3 rounded-lg bg-surface border border-border text-sm text-text focus:border-accent outline-none" placeholder="e.g. HSC" value={standard} onChange={e=>setStandard(e.target.value)} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-sub uppercase">Questions</label>
                    <input type="number" className="w-full p-3 rounded-lg bg-surface border border-border text-sm text-text focus:border-accent outline-none" value={questions} onChange={e=>setQuestions(parseInt(e.target.value))} min={1} max={50} />
                </div>
            </div>

            {/* Others */}
            <div className="space-y-1">
                <label className="text-xs font-bold text-sub uppercase">Others (Optional)</label>
                <textarea className="w-full p-3 rounded-lg bg-surface border border-border text-sm text-text focus:border-accent outline-none h-20 resize-none" placeholder="Any specific instructions..." value={others} onChange={e=>setOthers(e.target.value)}></textarea>
            </div>

            {/* Negative Marking Checkbox */}
            <div>
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border bg-surface/50 hover:bg-surface transition">
                <input type="checkbox" className="w-5 h-5 accent-accent" checked={negativeMarking} onChange={e => setNegativeMarking(e.target.checked)} />
                <div>
                    <div className="text-xs font-bold text-text">Negative Marking</div>
                    <div className="text-[10px] text-sub">Deduct 0.25 per wrong answer</div>
                </div>
                </label>
            </div>
        </div>

        <div className="p-4 border-t border-border bg-surface/50 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-text font-semibold text-sm hover:bg-surface transition">Cancel</button>
            <button onClick={() => {
                if(!subject || !topic || !standard) return alert("Please fill required fields");
                onCreate({ subject, topic, standard, questions, others, negativeMarking });
            }} className="flex-1 py-3 rounded-xl bg-accent text-white font-bold text-sm shadow-lg shadow-accent/30 hover:bg-accent/90 transition">Generate</button>
        </div>
      </div>
    </div>
  );
};

const Header = ({ title, leftIcon, onLeft, rightIcon, onRight }: any) => (
  <div className="h-[60px] px-5 flex items-center justify-between bg-bg border-b border-border shrink-0 sticky top-0 z-10">
    <button onClick={onLeft} className="w-10 h-10 rounded-xl border border-border bg-surface-2 text-text flex items-center justify-center hover:bg-surface transition">{leftIcon}</button>
    <span className="font-bold text-text">{title}</span>
    <div className="w-10 h-10 flex items-center justify-center">{rightIcon ? <button onClick={onRight} className="w-10 h-10 rounded-xl border border-border bg-surface-2 text-text flex items-center justify-center hover:bg-surface transition">{rightIcon}</button> : null}</div>
  </div>
);

// --- MAIN APP ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'home' | 'editor' | 'preview' | 'library'>('home');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Initialize Auth & Data
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const local = localStorage.getItem(`ch_data_${u.uid}`);
        if (local) setProjects(JSON.parse(local));
        
        // Sync Firestore
        try {
          const snap = await getDocs(collection(db, 'users', u.uid, 'projects'));
          const cloudProjects: Project[] = [];
          snap.forEach(d => cloudProjects.push({ id: d.id, ...d.data() } as Project));
          if (cloudProjects.length) {
            const sorted = cloudProjects.sort((a, b) => b.date - a.date);
            setProjects(sorted);
            localStorage.setItem(`ch_data_${u.uid}`, JSON.stringify(sorted));
          }
        } catch (e) { console.error(e); }
      } else {
        setUser(null);
        setProjects([]);
      }
    });
    return () => unsub();
  }, []);

  // Dark Mode Init
  useEffect(() => {
    const theme = localStorage.getItem('ch_theme');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  }, []);

  // Cleanup Preview URL
  useEffect(() => {
    return () => { if(previewUrl) URL.revokeObjectURL(previewUrl); }
  }, [previewUrl]);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('ch_theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  };

  const saveProject = async (p: Project) => {
    if (!user) return;
    const updated = [...projects.filter(x => x.id !== p.id), p].sort((a, b) => b.date - a.date);
    setProjects(updated);
    localStorage.setItem(`ch_data_${user.uid}`, JSON.stringify(updated));
    await setDoc(doc(db, 'users', user.uid, 'projects', p.id), p);
  };

  const handleCreate = async (config: QuizConfig) => {
    setShowModal(false);
    setLoadingMsg("Generating Quiz with Gemini...");
    try {
      const generatedCode = await generateQuizCode(config);
      const newProject: Project = {
        id: Date.now().toString(),
        name: `${config.topic} Quiz`,
        code: generatedCode,
        date: Date.now(),
        subject: config.subject,
        topic: config.topic
      };
      await saveProject(newProject);
      setActiveProject(newProject);
      setCode(newProject.code);
      setView('editor');
    } catch (e: any) {
      alert("Generation Failed: " + e.message);
    } finally {
      setLoadingMsg(null);
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Delete this project?")) return;
    if (!user) return;
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    localStorage.setItem(`ch_data_${user.uid}`, JSON.stringify(updated));
    await deleteDoc(doc(db, 'users', user.uid, 'projects', id));
    if(activeProject?.id === id) setView('home');
  };

  const handleRename = async (id: string) => {
    const p = projects.find(x => x.id === id);
    if(!p) return;
    const newName = prompt("New Name:", p.name);
    if(newName && newName.trim()) {
       const updated = { ...p, name: newName.trim() };
       await saveProject(updated);
    }
  }

  const handleRun = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setView('preview');
  };

  if (!user) return <AuthView onLogin={() => {}} />;

  return (
    <div className="h-full w-full flex flex-col bg-bg text-text font-sans">
      
      {loadingMsg && (
        <div className="fixed inset-0 z-[9999] bg-bg flex flex-col items-center justify-center">
          <div className="spinner mb-4"></div>
          <p className="text-text font-semibold animate-pulse">{loadingMsg}</p>
        </div>
      )}

      <NewProjectModal isOpen={showModal} onClose={() => setShowModal(false)} onCreate={handleCreate} />

      {view === 'home' && (
        <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
          <div className="p-5 flex justify-between items-center">
             <button onClick={() => { if(confirm("Logout?")) signOut(auth); }} className="w-10 h-10 rounded-xl border border-border text-danger flex items-center justify-center"><i className="fas fa-power-off"></i></button>
             <button onClick={toggleTheme} className="w-10 h-10 rounded-xl border border-border text-text flex items-center justify-center"><i className="fas fa-adjust"></i></button>
          </div>

          <div className="mx-5 mb-6 p-6 rounded-3xl bg-gradient-to-br from-accent to-indigo-600 text-white shadow-xl shadow-accent/20">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border border-white/30"><i className="fas fa-user text-xl"></i></div>
                <div>
                    <div className="text-sm opacity-90">Welcome back,</div>
                    <div className="font-bold text-lg">{user.email?.split('@')[0]}</div>
                </div>
            </div>
          </div>

          {/* Gemini Card Removed as requested */}

          <div className="grid grid-cols-2 gap-3 px-5 mb-6">
            <button onClick={() => setShowModal(true)} className="bg-surface-2 p-5 rounded-[20px] border border-border flex flex-col items-center justify-center gap-3 hover:bg-surface transition shadow-sm active:scale-95">
                <i className="fas fa-magic text-2xl text-accent"></i>
                <span className="font-bold text-sm">Generate Quiz</span>
            </button>
            <button onClick={() => setView('library')} className="bg-surface-2 p-5 rounded-[20px] border border-border flex flex-col items-center justify-center gap-3 hover:bg-surface transition shadow-sm active:scale-95">
                <i className="fas fa-folder-open text-2xl text-text"></i>
                <span className="font-bold text-sm">Library</span>
            </button>
          </div>

          <div className="mt-auto p-6 text-center text-xs text-sub opacity-60">Created by Tamim</div>
        </div>
      )}

      {view === 'library' && (
        <div className="flex-1 flex flex-col h-full animate-fade-in">
          <Header title="Projects" leftIcon={<i className="fas fa-arrow-left"></i>} onLeft={() => setView('home')} />
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {projects.length === 0 ? (
                <div className="text-center text-sub mt-10">No projects found.</div>
            ) : (
                projects.map(p => (
                    <div key={p.id} onClick={() => { setActiveProject(p); setCode(p.code); setView('editor'); }} className="bg-surface-2 p-4 rounded-2xl border border-border shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.98] transition">
                        <div>
                            <div className="font-bold text-text">{p.name}</div>
                            <div className="text-xs text-sub">{new Date(p.date).toLocaleDateString()}</div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); handleRename(p.id); }} className="p-2 text-accent hover:bg-surface rounded-lg"><i className="fas fa-pencil-alt"></i></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="p-2 text-danger hover:bg-surface rounded-lg"><i className="fas fa-trash"></i></button>
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>
      )}

      {view === 'editor' && activeProject && (
        <div className="flex-1 flex flex-col h-full animate-fade-in">
           <Header 
                title={activeProject.name} 
                leftIcon={<i className="fas fa-arrow-left"></i>} 
                onLeft={() => setView('library')}
                rightIcon={<i className="fas fa-save"></i>}
                onRight={async () => {
                    const updated = { ...activeProject, code, date: Date.now() };
                    await saveProject(updated);
                    setActiveProject(updated);
                    alert('Saved!');
                }}
            />
            <div className="flex-1 relative">
                <textarea 
                    className="w-full h-full p-5 bg-bg text-text font-mono text-sm resize-none outline-none" 
                    value={code} 
                    onChange={e => setCode(e.target.value)} 
                    spellCheck={false}
                ></textarea>
                <button onClick={handleRun} className="absolute bottom-6 right-6 w-14 h-14 bg-accent text-white rounded-full shadow-lg shadow-accent/40 flex items-center justify-center text-xl hover:scale-105 transition">
                    <i className="fas fa-play"></i>
                </button>
            </div>
        </div>
      )}

      {view === 'preview' && (
        <div className="flex-1 flex flex-col h-full bg-white animate-fade-in relative">
            <div className="absolute top-4 left-0 w-full flex justify-center pointer-events-none z-50">
                 <button onClick={() => setView('editor')} className="pointer-events-auto bg-zinc-900 text-white px-6 py-2 rounded-full shadow-xl flex items-center gap-2 font-bold text-sm hover:scale-105 transition">
                    <i className="fas fa-code"></i> Edit Code
                 </button>
            </div>
            <iframe 
                className="w-full h-full border-none bg-white" 
                src={previewUrl || ''}
                title="Preview"
            ></iframe>
        </div>
      )}

    </div>
  );
}