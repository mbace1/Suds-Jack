// index.js — who comes and when, per mode (docs/SIM_CONTRACT.md).
import arcade from './arcade.js?v=65';
import survival from './survival.js?v=65';
import campaign from './campaign.js?v=65';

export const DIRECTORS = { arcade, hardcade: arcade, survival, campaign };
