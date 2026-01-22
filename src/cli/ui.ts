
const COLORS = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    gray: "\x1b[90m",
    
    bgRed: "\x1b[41m",
    bgGreen: "\x1b[42m",
    bgYellow: "\x1b[43m",
    bgBlue: "\x1b[44m",
    bgMagenta: "\x1b[45m",
    bgCyan: "\x1b[46m",
};

export const ui = {
    colors: COLORS,
    
    bold: (text: string) => `${COLORS.bold}${text}${COLORS.reset}`,
    dim: (text: string) => `${COLORS.dim}${text}${COLORS.reset}`,
    red: (text: string) => `${COLORS.red}${text}${COLORS.reset}`,
    green: (text: string) => `${COLORS.green}${text}${COLORS.reset}`,
    yellow: (text: string) => `${COLORS.yellow}${text}${COLORS.reset}`,
    blue: (text: string) => `${COLORS.blue}${text}${COLORS.reset}`,
    magenta: (text: string) => `${COLORS.magenta}${text}${COLORS.reset}`,
    cyan: (text: string) => `${COLORS.cyan}${text}${COLORS.reset}`,
    gray: (text: string) => `${COLORS.gray}${text}${COLORS.reset}`,
    
    header: (text: string) => {
        const line = "─".repeat(Math.min(text.length + 4, 60));
        console.log();
        console.log(`${COLORS.cyan}┌${line}┐${COLORS.reset}`);
        console.log(`${COLORS.cyan}│${COLORS.reset} ${COLORS.bold}${text}${COLORS.reset}${" ".repeat(Math.max(0, line.length - text.length - 1))}${COLORS.cyan}│${COLORS.reset}`);
        console.log(`${COLORS.cyan}└${line}┘${COLORS.reset}`);
        console.log();
    },
    
    section: (text: string) => {
        console.log();
        console.log(`${COLORS.bold}${COLORS.blue}▸ ${text}${COLORS.reset}`);
        console.log();
    },
    
    success: (text: string) => {
        console.log(`${COLORS.green}✓${COLORS.reset} ${text}`);
        console.log();
    },
    
    error: (text: string) => {
        console.log(`${COLORS.red}✗${COLORS.reset} ${text}`);
        console.log();
    },
    
    warning: (text: string) => {
        console.log(`${COLORS.yellow}⚠${COLORS.reset} ${text}`);
        console.log();
    },
    
    info: (text: string) => {
        console.log(`${COLORS.blue}ℹ${COLORS.reset} ${text}`);
        console.log();
    },
    
    log: (text: string) => {
        console.log(text);
        console.log();
    },
    
    item: (icon: string, text: string, detail?: string) => {
        if (detail) {
            console.log(`  ${icon} ${text} ${COLORS.dim}${detail}${COLORS.reset}`);
        } else {
            console.log(`  ${icon} ${text}`);
        }
    },
    
    table: (rows: Array<{ label: string; value: string }>) => {
        const maxLabel = Math.max(...rows.map(r => r.label.length));
        console.log();
        for (const row of rows) {
            console.log(`  ${COLORS.dim}${row.label.padEnd(maxLabel)}${COLORS.reset}  ${row.value}`);
        }
        console.log();
    },
    
    spinner: {
        frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
        current: 0,
        interval: null as ReturnType<typeof setInterval> | null,
        
        start(text: string) {
            this.current = 0;
            process.stdout.write(`  ${this.frames[0]} ${text}`);
            this.interval = setInterval(() => {
                this.current = (this.current + 1) % this.frames.length;
                process.stdout.write(`\r  ${COLORS.cyan}${this.frames[this.current]}${COLORS.reset} ${text}`);
            }, 80);
        },
        
        stop(success = true) {
            if (this.interval) {
                clearInterval(this.interval);
                this.interval = null;
            }
            const icon = success ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`;
            process.stdout.write(`\r  ${icon}\n\n`);
        }
    },
    
    progress: (current: number, total: number, label?: string) => {
        const width = 30;
        const percent = Math.round((current / total) * 100);
        const filled = Math.round((current / total) * width);
        const bar = "█".repeat(filled) + "░".repeat(width - filled);
        const labelStr = label ? ` ${label}` : "";
        process.stdout.write(`\r  ${COLORS.cyan}${bar}${COLORS.reset} ${percent}%${labelStr}`);
        if (current === total) console.log("\n");
    },
    
    divider: () => {
        console.log();
        console.log(`${COLORS.dim}${"─".repeat(50)}${COLORS.reset}`);
        console.log();
    },
    
    banner: () => {
        console.log();
        console.log(`${COLORS.cyan}${COLORS.bold}  ████████╗ █████╗ ███████╗██╗  ██╗${COLORS.reset}`);
        console.log(`${COLORS.cyan}${COLORS.bold}  ╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝${COLORS.reset}`);
        console.log(`${COLORS.cyan}${COLORS.bold}     ██║   ███████║███████╗█████╔╝ ${COLORS.reset}`);
        console.log(`${COLORS.cyan}${COLORS.bold}     ██║   ██╔══██║╚════██║██╔═██╗ ${COLORS.reset}`);
        console.log(`${COLORS.cyan}${COLORS.bold}     ██║   ██║  ██║███████║██║  ██╗${COLORS.reset}`);
        console.log(`${COLORS.cyan}${COLORS.bold}     ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝${COLORS.reset}`);
        console.log(`${COLORS.dim}     High-Performance Agentic CLI${COLORS.reset}`);
        console.log();
    },

    streamToken: (token: string) => {
        process.stdout.write(token);
    },

    streamEnd: () => {
        console.log();
        console.log();
    }
};

export default ui;
