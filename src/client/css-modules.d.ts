/** CSS Modules class maps for `.module.css` imports (real map injected at build time). */
declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}
