// index.js — who comes and when, per mode (docs/SIM_CONTRACT.md).
import arcade from './arcade.js?v=13';
import survival from './survival.js?v=13';

export const DIRECTORS = { arcade, hardcade: arcade, survival };
