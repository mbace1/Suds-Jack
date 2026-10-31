// index.js — who comes and when, per mode (docs/SIM_CONTRACT.md).
import arcade from './arcade.js?v=67';
import survival from './survival.js?v=67';
import campaign from './campaign.js?v=67';

export const DIRECTORS = { arcade, hardcade: arcade, survival, campaign };
