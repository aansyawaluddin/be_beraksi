export function requestLogger(req, res, next) {
    const start = Date.now();

    res.on("finish", () => {
        const durasi = Date.now() - start;
        const query = Object.keys(req.query).length ? JSON.stringify(req.query) : "";
        console.log(
            `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durasi}ms) ${query}`
        );
    });

    next();
}