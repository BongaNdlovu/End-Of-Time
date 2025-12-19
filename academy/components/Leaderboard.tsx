import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, startAfter, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore';
import { Loader2, Trophy } from 'lucide-react';

import { db } from '../firebase';
import type { LeaderboardEntry, User } from '../types';

const PAGE_SIZE = 50;

export const Leaderboard: React.FC<{ user: User }> = ({ user }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const myUid = user.id;

  const myRowIndex = useMemo(() => entries.findIndex((e) => e.uid === myUid), [entries, myUid]);

  const loadPage = async (reset = false) => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const base = query(collection(db, 'academy_leaderboard'), orderBy('xpTotal', 'desc'), limit(PAGE_SIZE));
      const cursor = reset ? null : lastDoc;
      const q = cursor ? query(collection(db, 'academy_leaderboard'), orderBy('xpTotal', 'desc'), startAfter(cursor), limit(PAGE_SIZE)) : base;
      const snap = await getDocs(q);
      const docs = snap.docs;

      const batch = docs.map((d) => d.data() as LeaderboardEntry);
      setEntries((prev) => (reset ? batch : [...prev, ...batch]));
      setLastDoc(docs.length ? docs[docs.length - 1] : (reset ? null : lastDoc));
      setHasMore(docs.length === PAGE_SIZE);
    } catch (e) {
      console.error('Leaderboard load failed:', e);
      setError('Failed to load leaderboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto">
      <header className="mb-10 border-b border-white/10 pb-6 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={18} className="text-gold-500" />
            <span className="text-xs font-mono text-gold-500 uppercase tracking-widest">Global XP Leaderboard</span>
          </div>
          <h1 className="text-4xl font-display font-black uppercase italic tracking-tighter text-white">Leaderboard</h1>
          <p className="text-stone-400 text-sm mt-2">All signed-in students ranked by XP.</p>
        </div>
        <button
          onClick={() => loadPage(true)}
          disabled={isLoading}
          className="px-4 py-2 rounded-sm bg-white/5 hover:bg-white/10 border border-white/10 text-stone-200 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
        >
          Refresh
        </button>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded bg-red-950/30 border border-red-900/40 text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="glass-panel rounded-lg border border-white/10 overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-500 bg-black/20 border-b border-white/5">
          <div className="col-span-1">#</div>
          <div className="col-span-6">Student</div>
          <div className="col-span-2 text-right">XP</div>
          <div className="col-span-1 text-right">Lvl</div>
          <div className="col-span-2 text-right">Rank</div>
        </div>

        <div className="divide-y divide-white/5">
          {entries.map((e, idx) => {
            const isMe = e.uid === myUid;
            return (
              <div
                key={`${e.uid}-${idx}`}
                className={`grid grid-cols-12 px-5 py-4 text-sm items-center ${
                  isMe ? 'bg-gold-500/10' : 'bg-transparent'
                }`}
              >
                <div className="col-span-1 text-stone-500 font-mono tabular-nums">{idx + 1}</div>
                <div className="col-span-6 flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 overflow-hidden shrink-0">
                    {e.photoURL ? (
                      <img src={e.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-500 font-bold">?</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className={`font-bold truncate ${isMe ? 'text-gold-200' : 'text-stone-200'}`}>
                      {e.displayName || 'Student'} {isMe ? <span className="text-[10px] text-gold-500 ml-2">(You)</span> : null}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-stone-500">
                      Study Level {e.studyLevelCompleted || 0} completed
                    </div>
                  </div>
                </div>
                <div className="col-span-2 text-right font-mono tabular-nums text-stone-200">{e.xpTotal || 0}</div>
                <div className="col-span-1 text-right font-mono tabular-nums text-stone-400">{e.xpLevel || 1}</div>
                <div className="col-span-2 text-right text-stone-300 font-serif">{e.rank || 'Initiate'}</div>
              </div>
            );
          })}

          {entries.length === 0 && !isLoading && (
            <div className="px-5 py-10 text-center text-stone-500 text-sm">No leaderboard entries yet.</div>
          )}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="text-xs text-stone-500">
          {myRowIndex >= 0 ? `You are currently visible in this list.` : `Keep studying to climb the board.`}
        </div>
        {hasMore && (
          <button
            onClick={() => loadPage(false)}
            disabled={isLoading}
            className="px-6 py-3 rounded-sm bg-white/5 hover:bg-white/10 border border-white/10 text-stone-200 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
            Load More
          </button>
        )}
      </div>
    </div>
  );
};
