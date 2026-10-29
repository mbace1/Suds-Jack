// index.js — who comes and when, per mode (docs/SIM_CONTRACT.md).
import arcade from './arcade.js?v=59';
import survival from './survival.js?v=59';
import campaign from './campaign.js?v=59';

export const DIRECTORS = { arcade, hardcade: arcade, survival, campaign };
