import $ from 'jquery';

const waitUntilExisted = async (selector: JQuery.Selector, targetNode: Node = document): Promise<void> => {
  return new Promise<void>((resolve) => {
    const observer = new MutationObserver((mutationList, observer) => {
      // `mutationList` is an array of mutations that occurred
      // `observer` is the MutationObserver instance
      if ($(selector).length !== 0) {
        // stop observing
        observer.disconnect();
        resolve();
        return;
      }
    });
    // start observing
    observer.observe(targetNode, {
      childList: true,
      subtree: true,
    });
  });
};

export { waitUntilExisted };
