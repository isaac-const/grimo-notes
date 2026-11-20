import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { Home } from './components/Home';
import { FolderView } from './components/FolderView';
import { IdeaView } from './components/IdeaView';
import { NewFolderDialog } from './components/NewFolderDialog';
import { Gallery } from './components/Gallery';
import { Settings } from './components/Settings';
import { CommandPalette } from './components/CommandPalette';
import { useApp } from './lib/store';

export function App() {
  const { ready, load, route, addFolder, go } = useApp();
  const [newFolder, setNewFolder] = useState(false);
  useEffect(() => void load(), [load]);
  const key = route.name === 'home' || route.name === 'gallery' || route.name === 'settings' ? route.name : `${route.name}-${route.id}`;
  return (
    <div className="flex h-full">
      <Sidebar onNewFolder={() => setNewFolder(true)} />
      <main className="min-w-0 flex-1 overflow-y-auto px-6 py-8 md:px-12" id="main">
        {ready && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
              {route.name === 'home' && <Home onNewFolder={() => setNewFolder(true)} />}
              {route.name === 'gallery' && <Gallery />}
              {route.name === 'settings' && <Settings onNewFolder={() => setNewFolder(true)} />}
              {route.name === 'folder' && <FolderView id={route.id} />}
              {route.name === 'idea' && <IdeaView id={route.id} />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
      <CommandPalette onNewFolder={() => setNewFolder(true)} />
      <NewFolderDialog
        open={newFolder}
        onClose={() => setNewFolder(false)}
        onCreate={async (v) => {
          const f = await addFolder(v);
          setNewFolder(false);
          go({ name: 'folder', id: f.id });
        }}
      />
    </div>
  );
}
