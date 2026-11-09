// index.js — who comes and when, per mode (docs/SIM_CONTRACT.md).
import arcade from './arcade.js?v=128';
import survival from './survival.js?v=128';
import campaign from './campaign.js?v=128';

export const DIRECTORS = { arcade, hardcade: arcade, survival, campaign };
