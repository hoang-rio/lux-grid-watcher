import { memo } from "react";

function Footer() {
  return (
    <div className="card text-center footer">
      &copy; 2024{" "}
      <a href="https://hoangnguyendong.dev" target="_blank">
        Hoàng Rio
      </a>
      <br />
      Open source at:{" "}
      <a href="https://github.com/hoang-rio/lux-grid-watcher" target="_blank">
        Github
      </a>
    </div>
  );
}

export default memo(Footer);
