// index.js — who comes and when, per mode (docs/SIM_CONTRACT.md).
import arcade from './arcade.js?v=53';
import survival from './survival.js?v=53';
import campaign from './campaign.js?v=53';

export const DIRECTORS = { arcade, hardcade: arcade, survival, campaign };
