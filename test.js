const mockGetStore = async (fail) => {
    if (fail) throw new Error("Store doesn't exist");
    return "store";
};

const getAll = (fail) => {
    return new Promise(async (resolve, reject) => {
        const store = await mockGetStore(fail);
        resolve(store);
    }).catch(() => "caught fallback");
};

(async () => {
    console.log("Starting Promise.all...");
    try {
        const result = await Promise.all([
            getAll(false),
            getAll(true) // This will throw in getStore
        ]);
        console.log("Promise.all resolved:", result);
    } catch (e) {
        console.error("Promise.all caught error:", e);
    }
    console.log("Done.");
})();
