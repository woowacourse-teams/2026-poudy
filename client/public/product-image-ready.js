(() => {
  const imageSelector = "img[data-product-image]";
  const cardSelector = "[data-product-card]";

  const reveal = (image) => {
    const card = image.closest(cardSelector);
    if (!card || card.dataset.imageState === "loaded") return;

    card.dataset.imageState = "loaded";
    card.setAttribute("aria-busy", "false");
  };

  const revealIfComplete = (image) => {
    if (image.complete && image.naturalWidth > 0) reveal(image);
  };

  const scan = (root) => {
    if (root instanceof HTMLImageElement && root.matches(imageSelector)) revealIfComplete(root);
    if (!(root instanceof Element) && !(root instanceof Document)) return;

    root.querySelectorAll(imageSelector).forEach(revealIfComplete);
  };

  // load는 bubble하지 않으므로 capture 단계에서 받아 해당 이미지의 카드만 연다.
  document.addEventListener(
    "load",
    (event) => {
      if (event.target instanceof HTMLImageElement && event.target.matches(imageSelector)) reveal(event.target);
    },
    true,
  );

  // 스트리밍 및 클라이언트 이동으로 뒤늦게 붙은 이미지에도 같은 규칙을 적용한다.
  new MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === "attributes") {
        scan(record.target);
        return;
      }

      record.addedNodes.forEach(scan);
    });
  }).observe(document.documentElement, {
    attributeFilter: ["data-image-state"],
    attributes: true,
    childList: true,
    subtree: true,
  });

  scan(document);
})();
