document.addEventListener('DOMContentLoaded', function () {
  // モバイルナビ開閉
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      nav.classList.toggle('is-open');
    });
  }

  // モバイル時のドロップダウン(内部生・新規の方へ)開閉
  document.querySelectorAll('.has-dropdown > a').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (window.innerWidth <= 760) {
        e.preventDefault();
        link.parentElement.classList.toggle('is-open');
      }
    });
  });

  // 活動予定ページ:練習/本番タブ
  var tabButtons = document.querySelectorAll('.tab-btn');
  if (tabButtons.length) {
    tabButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-tab');
        tabButtons.forEach(function (b) { b.setAttribute('aria-selected', 'false'); });
        btn.setAttribute('aria-selected', 'true');
        document.querySelectorAll('.tab-panel').forEach(function (panel) {
          panel.classList.toggle('is-active', panel.id === target);
        });
      });
    });
  }
});


/* ============================================================
   トップバナー(スライド)
   - 6秒ごとに自動で切り替え(data-interval で変更可)
   - マウスを乗せている間/キーボード操作中/スワイプ中は一時停止
   - 停止・再生ボタンあり / 「動きを減らす」設定のときは自動切り替えなし
============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  var root = document.querySelector('[data-banner]');
  if (!root) return;

  var slides = Array.prototype.slice.call(root.querySelectorAll('.banner-slide'));
  var dots = Array.prototype.slice.call(root.querySelectorAll('.banner-dot'));
  var viewport = root.querySelector('.banner-viewport');
  var controls = root.querySelector('.banner-controls');
  var prevBtn = root.querySelector('.banner-arrow.prev');
  var nextBtn = root.querySelector('.banner-arrow.next');
  var toggleBtn = root.querySelector('.banner-toggle');
  if (slides.length < 2) {
    // 1枚だけなら操作UIは不要
    if (controls) controls.style.display = 'none';
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    return;
  }

  var interval = parseInt(root.getAttribute('data-interval'), 10) || 6000;
  root.style.setProperty('--banner-interval', interval + 'ms');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var current = 0;
  var userPaused = reduceMotion;   // ボタンによる停止
  var hoverPaused = false;         // マウスオーバー中
  var focusPaused = false;         // キーボードフォーカス中
  var touching = false;            // タッチ中
  var suppressClick = false;       // スワイプ直後のリンク遷移を防ぐ

  function go(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach(function (slide, i) {
      var on = i === current;
      slide.classList.toggle('is-active', on);
      slide.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
    dots.forEach(function (dot, i) {
      var on = i === current;
      dot.classList.toggle('is-active', on);
      if (on) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  }

  function applyPause() {
    var paused = userPaused || hoverPaused || focusPaused || touching || document.hidden;
    root.classList.toggle('is-paused', paused);
    // 自動で動いていないときは、切り替わりをスクリーンリーダーに通知する
    viewport.setAttribute('aria-live', paused ? 'polite' : 'off');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-pressed', String(userPaused));
      toggleBtn.setAttribute('aria-label', userPaused ? '自動切り替えを再開' : '自動切り替えを停止');
    }
  }

  // 進行バーのアニメーションが終わったら次へ(バーと切り替えタイミングが必ず一致する)
  controls.addEventListener('animationend', function (e) {
    if (!e.target.classList.contains('fill')) return;
    if (root.classList.contains('is-paused')) return;
    go(current + 1);
  });

  // ドット・矢印・停止ボタン
  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () { go(i); });
  });
  if (prevBtn) prevBtn.addEventListener('click', function () { go(current - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { go(current + 1); });
  if (toggleBtn) toggleBtn.addEventListener('click', function () {
    userPaused = !userPaused;
    applyPause();
  });

  // マウスオーバーで一時停止(タッチ端末の擬似hoverは除外)
  root.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'mouse') { hoverPaused = true; applyPause(); }
  });
  root.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'mouse') { hoverPaused = false; applyPause(); }
  });

  // キーボードでフォーカスしている間は一時停止(マウスクリックによるフォーカスは対象外)
  root.addEventListener('focusin', function (e) {
    var visible = true;
    try { visible = e.target.matches(':focus-visible'); } catch (err) {}
    if (visible) { focusPaused = true; applyPause(); }
  });
  root.addEventListener('focusout', function (e) {
    if (!root.contains(e.relatedTarget)) { focusPaused = false; applyPause(); }
  });

  // 左右キーで前後に切り替え
  root.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { go(current - 1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { go(current + 1); e.preventDefault(); }
  });

  // スマホのスワイプ操作
  var startX = 0, startY = 0;
  viewport.addEventListener('touchstart', function (e) {
    var t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    touching = true; applyPause();
  }, { passive: true });
  viewport.addEventListener('touchend', function (e) {
    var t = e.changedTouches[0];
    var dx = t.clientX - startX, dy = t.clientY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? current + 1 : current - 1);
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 400);
    }
    touching = false; applyPause();
  }, { passive: true });
  viewport.addEventListener('touchcancel', function () {
    touching = false; applyPause();
  }, { passive: true });
  viewport.addEventListener('click', function (e) {
    if (suppressClick) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // 別タブを見ている間は止める
  document.addEventListener('visibilitychange', applyPause);

  go(0);
  applyPause();
});
