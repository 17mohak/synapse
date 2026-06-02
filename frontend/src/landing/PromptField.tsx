import { useEffect, useId, useRef, useState } from "react";

import { useStore } from "../state/store";

interface Preset {
  label: string;
  prompt: string;
}

// The card's prompt line: reads as "PROMPT  <text>" like the reference, but the
// text is a real, editable input (earned familiarity over a fake-looking label).
// The field mirrors the analyzed prompt until the user edits it, then stays under
// their control. A quiet examples menu sits where the reference's glyph is.
export default function PromptField() {
  const runAnalyze = useStore((s) => s.runAnalyze);
  const analyzedPrompt = useStore((s) => s.analyzedPrompt);
  const status = useStore((s) => s.status);

  const [value, setValue] = useState("");
  const [dirty, setDirty] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const loading = status === "loading";
  const lastSynced = useRef<string | null>(null);
  const inputId = useId(); // unique per instance (the field mounts in card + overlay)

  useEffect(() => {
    fetch("/presets.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Preset[]) => setPresets(d))
      .catch(() => setPresets([]));
  }, []);

  // Reflect each new analysis in the field, unless the user has taken over.
  useEffect(() => {
    if (analyzedPrompt && analyzedPrompt !== lastSynced.current && !dirty) {
      setValue(analyzedPrompt);
      lastSynced.current = analyzedPrompt;
    }
  }, [analyzedPrompt, dirty]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || loading) return;
    setDirty(false);
    void runAnalyze(value);
  }

  function pick(e: React.ChangeEvent<HTMLSelectElement>) {
    const prompt = e.target.value;
    if (!prompt) return;
    setValue(prompt);
    setDirty(false);
    void runAnalyze(prompt);
    e.target.selectedIndex = 0;
  }

  return (
    <form className="prompt" onSubmit={submit}>
      <label className="prompt__label" htmlFor={inputId}>
        Prompt
      </label>
      <input
        id={inputId}
        className="prompt__input"
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
        }}
        placeholder="Water is made of hydrogen and"
        aria-label="Prompt"
        spellCheck={false}
        autoComplete="off"
      />
      <button
        className="prompt__go"
        type="submit"
        disabled={loading || !value.trim()}
        aria-label="Analyze prompt"
        title="Analyze"
      >
        {loading ? <span className="prompt__spinner" aria-hidden="true" /> : "Run"}
      </button>
      <select className="prompt__presets" onChange={pick} aria-label="Example prompts" defaultValue="">
        <option value="" disabled>
          Examples
        </option>
        {presets.map((p) => (
          <option key={p.prompt} value={p.prompt}>
            {p.label}
          </option>
        ))}
      </select>
    </form>
  );
}
