import { useTheme } from '../context/ThemeContext.jsx'

export function ThemeSelect() {
  const { preference, setPreference } = useTheme()
  return (
    <div className="theme-control">
      <label htmlFor="theme-preference">Appearance</label>
      <select className="theme-select" id="theme-preference" value={preference}
        onChange={(event) => setPreference(event.target.value)}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  )
}
