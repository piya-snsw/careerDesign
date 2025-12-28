import React from "react";

/**
 * Loginコンポーネント
 * @param {Function} onLoginAnonymously - 匿名ログイン実行関数
 * @param {Function} onLoginWithGoogle - Googleログイン実行関数
 */
const Login = ({ onLoginAnonymously, onLoginWithGoogle }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-sm w-full bg-white p-10 rounded-[3rem] shadow-2xl shadow-blue-100 border border-slate-100 text-center animate-in fade-in zoom-in duration-500">
        
        {/* ロゴ・ヘッダー部分 */}
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-[2rem] rotate-12 mb-6 shadow-xl shadow-blue-200 group hover:rotate-0 transition-transform duration-300">
            <span className="text-4xl text-white font-black -rotate-12 group-hover:rotate-0 transition-transform">Q</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 italic tracking-tighter">
            Quiz Buster <span className="text-blue-600">FE</span>
          </h1>
          <p className="text-slate-400 text-xs mt-3 font-bold tracking-widest uppercase">
            It's time to battle
          </p>
        </div>

        {/* ログインアクション */}
        <div className="space-y-4">
          {/* Google ログインボタン */}
          <button
            onClick={onLoginWithGoogle}
            className="w-full py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-blue-200 transition-all active:scale-95 shadow-sm group"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              width="22"
              height="22"
              alt="Google Logo"
              className="group-hover:scale-110 transition-transform"
            />
            <span className="text-slate-700">Googleでログイン</span>
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="h-[1px] bg-slate-100 flex-1"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">OR</span>
            <div className="h-[1px] bg-slate-100 flex-1"></div>
          </div>

          {/* 匿名（ゲスト）ログインボタン */}
          <button
            onClick={onLoginAnonymously}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
          >
            ゲストモードで開始
          </button>
        </div>

        {/* フッター・免責事項など */}
        <div className="mt-10">
          <p className="text-[10px] text-slate-300 font-bold leading-relaxed">
            ※ ゲストモードの場合、ログアウトすると<br/>
            データが保持されません。
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;