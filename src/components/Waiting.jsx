import React from "react";
import { useWaiting } from "../hooks/useWaiting";
import { useRoom } from "../hooks/useRoom";
import { auth } from "../firebase";

const Waiting = ({ user }) => {
    // hooks側で isFull (4人以上) かどうかを判定して返している前提です
    const { waitingUsers, isFull } = useWaiting(user);
    const { updateRoom } = useRoom("room1");

    // 自分がすでにリストの中にいる（＝参加できている）かチェック
    const isJoined = waitingUsers.some((u) => u.uid === user.uid);

    const handleStartGame = async () => {
        const allIds = ["q1", "q2", "q3", "q4"];
        const shuffled = [...allIds].sort(() => Math.random() - 0.5);

        await updateRoom({
            status: "watching",
            questionOrder: shuffled,
            currentQuestionIndex: 0,
            currentQuestionId: shuffled[0],
            buzzerUser: "",
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-blue-100 border border-slate-100 text-center relative overflow-hidden">

                <button
                    onClick={() => auth.signOut()}
                    className="absolute top-6 right-6 text-[10px] font-black text-slate-400 hover:text-red-500 transition-colors uppercase tracking-[0.2em] flex items-center gap-1"
                >
                    <span>Leave Lobby</span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>

                <div className="w-full max-w-sm bg-white rounded-[2.5rem] ..."></div>




                {/* 満員時のオーバーレイ警告（未参加者のみ表示） */}
                {isFull && !isJoined && (
                    <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <h3 className="text-lg font-black text-slate-800 mb-2">満員です</h3>
                        <p className="text-slate-500 text-xs font-bold leading-relaxed">
                            現在ルームが定員(4名)に達しています。<br />空きが出るまでお待ちください。
                        </p>
                    </div>
                )}

                {/* ロゴ・タイトル */}
                <div className="mb-8">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-sm transition-colors ${isFull ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                        <span className="text-3xl font-black italic">{isFull ? "!" : "!"}</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 italic tracking-tighter uppercase">Waiting Lobby</h2>
                    <p className="text-slate-400 text-[10px] mt-1 font-bold tracking-[0.2em] uppercase">Room: Room1</p>
                </div>

                {/* 参加者リストセクション */}
                <div className="bg-slate-50 rounded-[2rem] p-6 mb-10 border border-slate-100 shadow-inner">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            Members Online
                        </p>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isFull ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                            {waitingUsers.length} / 4
                        </span>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2">
                        {waitingUsers.length > 0 ? (
                            waitingUsers.map((u, i) => (
                                <div
                                    key={u.uid || i}
                                    className={`px-4 py-2 bg-white border rounded-full text-sm font-bold shadow-sm animate-in fade-in zoom-in duration-300 ${u.uid === user.uid ? 'border-blue-200 text-blue-600' : 'border-slate-200 text-slate-600'}`}
                                >
                                    <span className={u.uid === user.uid ? 'text-blue-400 mr-1' : 'text-slate-300 mr-1'}>●</span>
                                    {u.displayName || "ゲスト"}
                                    {u.uid === user.uid && <span className="ml-1 text-[8px] opacity-60">(You)</span>}
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-300 text-xs font-bold animate-pulse italic py-2">待機者を待っています...</p>
                        )}
                    </div>
                </div>

                {/* アクションボタン */}
                <div className="space-y-4">
                    <button
                        onClick={handleStartGame}
                        disabled={waitingUsers.length === 0 || (isFull && !isJoined)}
                        className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 ${waitingUsers.length > 0 && !(isFull && !isJoined)
                                ? "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-500"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                            }`}
                    >
                        {isFull && !isJoined ? "入室制限中" : "対戦を開始する"}
                    </button>

                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                        {isFull ? "現在これ以上参加できません" : waitingUsers.length > 0 ? "全員揃ったらスタート！" : "対戦相手を待っています"}
                    </p>
                </div>
            </div>

            {/* ユーザー情報フッター */}
            <div className="mt-8 px-6 py-2 bg-white/50 backdrop-blur-sm rounded-full border border-white shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Signed in as: <span className="text-blue-600">{user?.displayName || "Guest"}</span>
                </p>
            </div>
        </div>
    );
};

export default Waiting;