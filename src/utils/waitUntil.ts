const waitUntil = (callback: () => boolean, timeout = 0, parent: Document = document): Promise<boolean> => {
  let timerId: number;
  return new Promise<boolean>((resolve) => {
    const observer = new MutationObserver((mutationList, observer) => {
      if (callback()) {
        observer.disconnect();
        window.clearTimeout(timerId);
        resolve(true);
      }
    });
    if (timeout > 0) {
      timerId = window.setTimeout(() => {
        resolve(false);
      }, timeout);
    }
    observer.observe(parent, {
      childList: true,
      subtree: true,
    });
  });
};

export { waitUntil };
