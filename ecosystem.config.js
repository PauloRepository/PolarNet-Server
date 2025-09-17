module.exports = {
    apps: [
        {
            name: "PolarNet-Server",
            script: "src/main.js",
            watch: true,
            watch_options: {
                "followSymlinks": false
            },
            ignore_watch: ["node_modules", "public", ".git/**"],
            env: {
                NODE_ENV: "production",
                LD_LIBRARY_PATH: "/opt/oracle/instantclient_19_8",
            },
            node_args: ["--max_old_space_size=200"],
            max_memory_restart: "180M",
        },
    ],
};
