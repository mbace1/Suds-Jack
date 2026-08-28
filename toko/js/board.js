// TOKO MIDORI GAMES — live board wrapper.
// Keep the deployed brand-board implementation intact, then layer the newer
// project knowledge/conversation, local small brain, and counter layout guard.
import './board-base.js';
import { mountProjectConversation } from './project-conversation.js';
import { mountBrainConversation } from './brain-conversation.js';
import { guardCounter } from './chat-layout-fix.js';

mountProjectConversation(document);
mountBrainConversation(document);
globalThis.TokoChatLayout = guardCounter(document);
