export const quickSelectOptions = [
    { regex: "\\s", text: "Space" },
    { regex: "\\n", text: "New Line" },
    { regex: "\\d", text: "Digit"},
    { regex: `\\[(?:\\d+|\\w)\\]`, text: "Wiki Citations"},
    { regex: `\\b\\w`, text: "First Letters"},
    { regex: `\\w\\b`, text: "Last Letters"}
  ];