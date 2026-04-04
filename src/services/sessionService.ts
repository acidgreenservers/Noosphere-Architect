
let openRouterKey: string | null = null;
let openRouterModel: string | null = null;

export const setOpenRouterKey = (key: string | null) => {
  openRouterKey = key;
};

export const getOpenRouterKey = () => openRouterKey;

export const setOpenRouterModel = (model: string | null) => {
  openRouterModel = model;
};

export const getOpenRouterModel = () => openRouterModel;

export const clearSession = () => {
  openRouterKey = null;
  openRouterModel = null;
};
