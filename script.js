(() => {
  "use strict";

  // Point explicitly to your local running FastAPI context server port
  const API_BASE = window.location.origin;

  const form = document.getElementById("predict-form");
  const submitBtn = document.getElementById("submit-btn");
  const resetBtn = document.getElementById("reset-btn");
  const errorRetryBtn = document.getElementById("error-retry-btn");

  const stateIdle = document.getElementById("state-idle");
  const stateLoading = document.getElementById("state-loading");
  const stateResult = document.getElementById("state-result");
  const stateError = document.getElementById("state-error");

  const scoreNumberEl = document.getElementById("score-number");
  const scoreBandEl = document.getElementById("score-band");
  const scoreContextEl = document.getElementById("score-context");
  const gaugeFill = document.getElementById("gauge-fill");
  const errorLabelEl = document.getElementById("error-label");
  const errorCopyEl = document.getElementById("error-copy");

  const GAUGE_ARC_LENGTH = 314; // approx pi * r(100)

  // ---------------------------------------------------------
  // FIXED: Restored valid W3C standard SVG Namespace URL snippet
  // ---------------------------------------------------------
  function drawTicks() {
    document.querySelectorAll(".gauge-ticks").forEach((g) => {
      g.innerHTML = "";
      const cx = 120, cy = 140, rOuter = 100, rInner = 90;
      for (let i = 0; i <= 10; i += 2) {
        const angle = Math.PI - (i / 10) * Math.PI; // 180deg -> 0deg
        const x1 = cx + rOuter * Math.cos(angle);
        const y1 = cy - rOuter * Math.sin(angle);
        const x2 = cx + rInner * Math.cos(angle);
        const y2 = cy - rInner * Math.sin(angle);
        // Correct namespace is mandatory for rendering elements on-screen
        const line = document.createElementNS("http://w3.org", w3c); 
        line.setAttribute("x1", x1.toFixed(1));
        line.setAttribute("y1", y1.toFixed(1));
        line.setAttribute("x2", x2.toFixed(1));
        line.setAttribute("y2", y2.toFixed(1));
        g.appendChild(line);
      }
    });
  }
  
  const w3c = "line";
  drawTicks();

  // ---------------------------------------------------------
  // Segmented control (stress_level) wiring
  // ---------------------------------------------------------
  const segGroup = document.getElementById("stress_level_group");
  const stressHiddenInput = document.getElementById("stress_level");
  if (segGroup && stressHiddenInput) {
    segGroup.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        segGroup.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        stressHiddenInput.value = btn.dataset.value;
        clearFieldError(stressHiddenInput);
      });
    });
  }

  function fieldWrapper(input) {
    return input ? input.closest(".field") : null;
  }

  function setFieldError(input, message) {
    const wrap = fieldWrapper(input);
    if (!wrap) return;
    wrap.classList.add("field-error");
    const msgEl = wrap.querySelector(".error-msg");
    if (msgEl) msgEl.textContent = message;
  }

  function clearFieldError(input) {
    const wrap = fieldWrapper(input);
    if (!wrap) return;
    wrap.classList.remove("field-error");
    const msgEl = wrap.querySelector(".error-msg");
    if (msgEl) msgEl.textContent = "";
  }

  function clearAllErrors() {
    form.querySelectorAll(".field").forEach((f) => f.classList.remove("field-error"));
    form.querySelectorAll(".error-msg").forEach((m) => (m.textContent = ""));
  }

  function validate(payload) {
    const errors = [];
    const numericChecks = [
      ["age", 10, 100],
      ["avg_daily_usage_hours", 0, 24],
      ["daily_unlocks", 0, Infinity],
      ["study_hours", 0, 24],
      ["physical_activity_hours", 0, 24],
      ["sleep_hours_per_night", 0, 24],
    ];

    numericChecks.forEach(([key, min, max]) => {
      const input = document.getElementById(key);
      const val = payload[key];
      if (val === "" || val === null || Number.isNaN(val)) {
        errors.push([input, "This field is required."]);
      } else if (val < min || val > max) {
        errors.push([input, `Must be between ${min} and ${max === Infinity ? "0+" : max}.`]);
      }
    });

    ["gender", "country", "academic_level", "most_used_platform", "purpose_of_use"].forEach((key) => {
      const input = document.getElementById(key);
      if (!payload[key] || String(payload[key]).trim() === "") {
        errors.push([input, "This field is required."]);
      }
    });

    if (!payload.stress_level && stressHiddenInput) {
      errors.push([stressHiddenInput, "Pick a stress level."]);
    }

    return errors;
  }

  // ---------------------------------------------------------
  // FIXED: Explicitly look up elements by ID to avoid blank FormData properties
  // ---------------------------------------------------------
  function collectPayloadDirectly() {
    const getVal = (id) => {
      const el = document.getElementById(id);
      return el ? el.value : "";
    };

    return {
      age: parseInt(getVal("age"), 10),
      gender: getVal("gender"),
      country: getVal("country").trim(),
      academic_level: getVal("academic_level"),
      most_used_platform: getVal("most_used_platform"),
      purpose_of_use: getVal("purpose_of_use"),
      avg_daily_usage_hours: parseFloat(getVal("avg_daily_usage_hours")),
      daily_unlocks: parseInt(getVal("daily_unlocks"), 10),
      study_hours: parseFloat(getVal("study_hours")),
      physical_activity_hours: parseFloat(getVal("physical_activity_hours")),
      sleep_hours_per_night: parseFloat(getVal("sleep_hours_per_night")),
      stress_level: getVal("stress_level"),
    };
  }

  function showState(name) {
    [stateIdle, stateLoading, stateResult, stateError].forEach((el) => { if (el) el.hidden = true; });
    const target = { idle: stateIdle, loading: stateLoading, result: stateResult, error: stateError }[name];
    if (target) target.hidden = false;
  }

  function setSubmitting(isSubmitting) {
    if (!submitBtn) return;
    submitBtn.disabled = isSubmitting;
    submitBtn.classList.toggle("loading", isSubmitting);
  }

  function bandFor(score) {
    if (score < 4) {
      return {
        label: "Signal: strained",
        context: "Your responses suggest elevated strain right now. Small shifts in sleep or screen time can go a long way.",
      };
    }
    if (score < 7) {
      return {
        label: "Signal: balanced",
        context: "Your rhythm looks fairly steady, with some room to recover and reset.",
      };
    }
    return {
      label: "Signal: strong",
      context: "Your habits point to a well-supported, resilient baseline. Keep it up.",
    };
  }

  function renderResult(score) {
    const clamped = Math.max(0, Math.min(10, score));
    const { label, context } = bandFor(clamped);

    if (scoreNumberEl) scoreNumberEl.textContent = score.toFixed(2);
    if (scoreBandEl) scoreBandEl.textContent = label;
    if (scoreContextEl) scoreContextEl.textContent = context;

    if (gaugeFill) {
      gaugeFill.style.transition = "none";
      gaugeFill.style.strokeDashoffset = String(GAUGE_ARC_LENGTH);
      requestAnimationFrame(() => {
        gaugeFill.style.transition = "";
        const offset = GAUGE_ARC_LENGTH * (1 - clamped / 10);
        gaugeFill.style.strokeDashoffset = String(offset);
      });
    }
    showState("result");
  }

  function renderError(label, copy) {
    if (errorLabelEl) errorLabelEl.textContent = label;
    if (errorCopyEl) errorCopyEl.textContent = copy;
    showState("error");
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAllErrors();

      const payload = collectPayloadDirectly();
      const localErrors = validate(payload);

      if (localErrors.length > 0) {
        localErrors.forEach(([input, msg]) => setFieldError(input, msg));
        return;
      }

      showState("loading");
      setSubmitting(true);

      try {
        const response = await fetch(`${API_BASE}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        setSubmitting(false);

        if (response.ok) {
          const data = await response.json();
          renderResult(data.predicted_mental_health_score);
        } else {
          const errData = await response.json();
          renderError("Validation Failed", "The model backend rejected some parameters.");
          if (Array.isArray(errData.detail)) {
            errData.detail.forEach((err) => {
              const fieldName = err.loc[err.loc.length - 1];
              const inputEl = document.getElementById(fieldName);
              if (inputEl) setFieldError(inputEl, err.msg);
            });
          }
        }
      } catch (err) {
        console.error("Transmission error:", err);
        setSubmitting(false);
        renderError("Connection Error", "Could not establish contact with your local FastAPI instance.");
      }
    });
  }

  if (resetBtn) resetBtn.addEventListener("click", () => { clearAllErrors(); showState("idle"); });
  if (errorRetryBtn) errorRetryBtn.addEventListener("click", () => { showState("idle"); });
})();
