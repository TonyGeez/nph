export const RED = '\x1b[0;31m';
export const WHITE = '\x1b[0;37m';
export const GREEN = '\x1b[0;32m';
export const CYAN = '\x1B[38;5;24m';
export const LIGHTCYAN = '\x1B[38;5;152m';
export const YELLOW = '\x1b[0;33m';
export const BLUE = '\x1B[38;5;31m';
export const BGBLUE = '\x1B[48;5;31m';
export const BGLIGHTCYAN = '\x1B[48;5;152m';
export const BOLD = '\x1B[1m';
export const DIM = '\x1B[2m';
export const RESET = '\x1B[0m';

export const WARNING = `${BOLD}${YELLOW}⚠ ${RESET}${YELLOW}`;
export const ERROR = `${BOLD}${RED} ✘${RESET}${RED}`;
export const SUCCESS = `${BOLD}${GREEN}${DIM} ✔${RESET}${GREEN}${DIM}`;
export const HEAD = `${BOLD}${BLUE}▍ `;
export const POINTER = `${BLUE}▍${RESET}`;
export const HL = `${BLUE}${BGBLUE}=====${RESET}${BOLD}${LIGHTCYAN}${BGBLUE}`;
export const HR = `${RESET}${BLUE}${BGBLUE}=====${RESET}`;
export const BAR = `${BLUE}${BGBLUE}============================${RESET}`;

export const HL_DEP = `${BLUE}${BGBLUE}=====${RESET}${BOLD}${LIGHTCYAN}${BGBLUE}`;
export const HR_DEP = `${RESET}${BLUE}${BGBLUE}=====${RESET}`;
export const BAR_DEP = `${BLUE}${BGBLUE}===============================${RESET}`;

export const HL_DEPRE = `${BLUE}${BGBLUE}=======${RESET}${BOLD}${LIGHTCYAN}${BGBLUE}`;
export const HR_DEPRE = `${RESET}${BLUE}${BGBLUE}=====${RESET}`;
export const BAR_DEPRE = `${BLUE}${BGBLUE}==================================${RESET}`;


export const HL_UP = `${BLUE}${BGBLUE}=======${RESET}${BOLD}${LIGHTCYAN}${BGBLUE}`;
export const HR_UP = `${RESET}${BLUE}${BGBLUE}=====${RESET}`;
export const BAR_UP = `${BLUE}${BGBLUE}=========================================${RESET}`;

export const HL_CLI = `${LIGHTCYAN}${BGLIGHTCYAN}=======${RESET}${BOLD}${BLUE}${BGLIGHTCYAN}`;
export const HR_CLI = `${RESET}${LIGHTCYAN}${BGLIGHTCYAN}=====${RESET}`;
export const BAR_CLI = `${LIGHTCYAN}${BGLIGHTCYAN}=================================${RESET}`;