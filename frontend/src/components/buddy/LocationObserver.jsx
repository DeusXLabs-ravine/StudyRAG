import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import useBuddy from '../../hooks/useBuddy';
import useBuddyStore from '../../store/buddyStore';

/**
 * LocationObserver
 * 
 * Silently watches the user's navigation and informs the Buddy about the current 
 * page context. This allows Buddy to "see" what the user is looking at and 
 * proactively offer relevant help (e.g. switching to Exam Prep mode).
 */
export default function LocationObserver() {
  const location = useLocation();
  const params = useParams();
  const { sendContextUpdate } = useBuddy();
  const setSessionContext = useBuddyStore(s => s.setSessionContext);
  const status = useBuddyStore(s => s.live.status);

  useEffect(() => {
    // Only update if a session is active or connecting
    const isActive = status === 'listening' || status === 'speaking' || status === 'connecting';
    
    // Determine path context
    const path = location.pathname;
    let title = 'General Navigation';
    let mode = 'freeform';
    let metadata = {};

    if (path.startsWith('/study')) {
      title = 'Study Dashboard';
    } else if (path.startsWith('/library')) {
      title = 'Document Library';
    } else if (path.startsWith('/document/')) {
      title = 'Learning Session';
      mode = 'feynman'; // Default for document learning
      metadata.documentId = params.documentId;
    } else if (path.startsWith('/exam')) {
      title = 'Exam Preparation';
      mode = 'exam_prep';
      metadata.isExamMode = true;
    } else if (path.startsWith('/quiz')) {
      title = 'Knowledge Quiz';
      mode = 'freeform';
    } else if (path.startsWith('/me')) {
      title = 'Personal Progress';
    }

    // Sync to store for UI consistency, but DON'T overwrite when we are on the buddy page itself
    // as the user might have just been redirected there with specific context.
    if (!path.startsWith('/buddy')) {
      const updates = { sessionGoal: mode };
      if (metadata.documentId) {
        updates.documentId = metadata.documentId;
      }
      setSessionContext(updates);
    }

    // Send "Stage Cue" to Buddy if active and NOT on the buddy page
    // (on the buddy page, the session already knows its own state)
    if (isActive && !path.startsWith('/buddy')) {
      sendContextUpdate({
        path,
        title,
        mode,
        metadata: {
          ...metadata,
          timestamp: Date.now()
        }
      });
    }
  }, [location.pathname, params.documentId, status === 'idle', sendContextUpdate, setSessionContext]);

  return null; // Silent observer
}
