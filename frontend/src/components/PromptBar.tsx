import { useEffect, useState } from "react";

import { useStore } from "../state/store";
import "./PromptBar.css";

interface Preset {
  label: string;
  prompt: string;
}

export default function PromptBar() {
  const runAnalyze = useStore((s) => s.runAnalyze);
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);

  const [value, setValue] = useState("");
  const [presets, setPresets] = useState<Preset[]>([]);
  const loading = status === "loading";

  useEffect(() => {
    fetch("/presets.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Preset[]) => setPresets(data))
      .catch(() => setPresets([]));
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || loading) return;
    void runAnalyze(value);
  }

  function pickPreset(e: React.ChangeEvent<HTMLSelectElement>) {
    const prompt = e.target.value;
    if (!prompt) return;
    setValue(prompt);
    void runAnalyze(prompt);
    e.target.selectedIndex = 0; // reset back to the placeholder
  }

  return (
    <form className="promptbar" onSubmit={submit}>
      <div className="promptbar__row">
        <input
          className="promptbar__input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="The Eiffel Tower is in the city of"
          aria-label="Prompt"
          autoFocus
          spellCheck={false}
        />
        <select
          className="promptbar__presets"
          onChange={pickPreset}
          aria-label="Example prompts"
          defaultValue=""
        >
          <option value="" disabled>
            Examples
          </option>
          {presets.map((p) => (
            <option key={p.prompt} value={p.prompt}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          className="promptbar__submit"
          type="submit"
          disabled={loading || !value.trim()}
        >
          {loading ? (
            <>
              <span className="promptbar__spinner" aria-hidden="true" />
              Analyzing
            </>
          ) : (
            "Analyze prompt"
          )}
        </button>
      </div>
      {error && (
        <p className="promptbar__error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
