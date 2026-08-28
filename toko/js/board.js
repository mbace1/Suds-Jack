// TOKO MIDORI GAMES — live board wrapper.
// Keep the deployed brand-board implementation intact, then layer the newer
// project knowledge/conversation and counter layout guard on top.
import './board-base.js';
import { mountProjectConversation } from './project-conversation.js';
import { guardCounter } from './chat-layout-fix.js';

mountProjectConversation(document);
globalThis.TokoChatLayout = guardCounter(document);
