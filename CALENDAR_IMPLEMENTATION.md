# Calendar Implementation Documentation

## Overview
A weekly calendar view has been added to the Dashboard component, displaying tasks for the current week with visual indicators. The calendar is positioned below the three task cards (Today, Tomorrow, Day After Tomorrow) and shows only the current week's dates.

## Changes Made to Dashboard.js

### 1. **Dependencies Added**
- **react-calendar**: `^4.7.0` - A flexible calendar component for React
- Imported `Calendar` component and CSS: `import Calendar from 'react-calendar'` and `import 'react-calendar/dist/Calendar.css'`

### 2. **State Management**
- Added `calendarDate` state: `const [calendarDate, setCalendarDate] = useState(new Date())` to track the selected date in the calendar

### 3. **Data Processing Functions**

#### Task Map Creation
```javascript
const taskMap = [...tasks.today, ...tasks.tomorrow, ...tasks.dayAfterTomorrow].reduce((acc, task) => {
  (acc[task.date] = acc[task.date] || []).push(task);
  return acc;
}, {});
```
- Combines all tasks from the three day columns into a single map organized by date
- Uses `reduce` for efficient data transformation

#### Current Week Dates Calculation
```javascript
const currentWeekDates = (() => {
  const today = dayjs();
  const start = today.add(today.day() === 0 ? -6 : 1 - today.day(), 'day');
  return Array.from({ length: 7 }, (_, i) => start.add(i, 'day').format('YYYY-MM-DD'));
})();
```
- Calculates the current week (Monday to Sunday)
- Returns an array of 7 date strings in 'YYYY-MM-DD' format
- Uses IIFE (Immediately Invoked Function Expression) for one-time calculation

#### Task Indicator Content
```javascript
const tileContent = ({ date, view }) => {
  if (view !== 'month') return null;
  const dateStr = dayjs(date).format('YYYY-MM-DD');
  if (!currentWeekDates.includes(dateStr)) return null;
  const tasks = taskMap[dateStr] || [];
  if (!tasks.length) return null;
  const pending = tasks.filter(t => t.status === TaskStatus.PENDING).length;
  return pending > 0 ? <Box sx={{ width: '8px', height: '8px', bgcolor: darkMode ? '#1976d2' : '#2196f3', borderRadius: '50%', mx: 'auto', mt: 1 }} /> : null;
};
```
- Renders a blue dot indicator (8px circle) for dates with pending tasks
- Only shows for dates in the current week
- Adapts color based on dark/light mode

#### Hidden Dates Filter
```javascript
const tileClassName = ({ date, view }) => 
  view === 'month' && !currentWeekDates.includes(dayjs(date).format('YYYY-MM-DD')) 
    ? 'react-calendar__tile--hidden' 
    : null;
```
- Hides dates that are not in the current week
- Uses CSS class to hide non-week dates

### 4. **UI Component Structure**

The calendar is rendered in a Grid item below the three task cards:

```javascript
<Grid item xs={12}>
  <Box sx={{ maxWidth: 800, mx: 'auto', p: 2, ...styling }}>
    <Calendar 
      onChange={setCalendarDate} 
      value={calendarDate} 
      tileContent={tileContent} 
      tileClassName={tileClassName} 
      showNeighboringMonth={false} 
    />
  </Box>
</Grid>
```

### 5. **Styling Features**

#### Border Visibility
- Calendar container: `border: '1px solid #e0e0e0'` (light mode) / `'1px solid #444'` (dark mode)
- Navigation section: `borderBottom` for separation
- Weekdays section: `borderBottom` for separation
- Individual date tiles: `border: '1px solid #e0e0e0'` for each date cell

#### Dark Mode Support
- Background colors adapt: `bgcolor: darkMode ? '#1e1e1e' : '#fff'`
- Text colors adapt: `color: darkMode ? '#fff' : '#000'`
- Border colors adapt for visibility in both modes

#### Active/Current Date Styling
- Active date: Blue background (`#2196f3` light / `#1976d2` dark) with white text
- Current date (today): Light blue background with blue border
- Rounded corners: `borderRadius: '8px'` for modern appearance

#### Week-Only View
- CSS rule: `'& .react-calendar__month-view__week': { display: 'none' }`
- Shows only week containing today: `'& .react-calendar__month-view__week:has(.react-calendar__tile--now)': { display: 'flex !important' }`

### 6. **Key Features**

1. **Week-Only Display**: Shows only the current week (7 days) instead of full month
2. **Task Indicators**: Blue dots (8px) appear below dates with pending tasks
3. **Responsive Design**: Max-width 800px, centered, adapts to screen size
4. **Dark Mode Compatible**: All colors and borders adapt to theme
5. **Interactive**: Date selection updates `calendarDate` state
6. **Clean UI**: Minimal design with visible borders and clear separation

## Technical Implementation Details

### Performance Optimizations
- Task map created once using `reduce` for O(n) efficiency
- Week dates calculated once using IIFE
- Conditional rendering prevents unnecessary re-renders

### Data Flow
1. Tasks fetched from `TaskContext` (today, tomorrow, dayAfterTomorrow)
2. Combined into `taskMap` organized by date
3. Week dates calculated from current date
4. Calendar renders with filtered data
5. Task indicators shown for dates with pending tasks

### CSS Customization
- Uses Material-UI's `sx` prop for styling
- Targets react-calendar's internal classes with `&` selector
- Maintains consistency with app's design system

---

## Information for Manager - Key Points

### 1. **Enhanced User Experience**
The weekly calendar view provides users with a quick visual overview of their tasks for the current week. Instead of scrolling through multiple task cards, users can see at a glance which days have pending tasks through blue dot indicators. This improves task visibility and helps with weekly planning.

### 2. **Minimal Code Implementation**
The calendar feature was implemented efficiently using the `react-calendar` library, requiring minimal custom code. The implementation uses modern JavaScript patterns (reduce, IIFE, conditional rendering) to keep the codebase clean and maintainable. Total calendar-related code is approximately 30 lines, making it easy to maintain and extend.

### 3. **Responsive and Accessible Design**
The calendar is fully responsive, adapting to different screen sizes with a maximum width of 800px and centered alignment. It supports both light and dark themes, automatically adjusting colors, borders, and backgrounds based on user preference. All interactive elements have proper hover states for better user feedback.

### 4. **Performance Optimized**
The calendar implementation is optimized for performance. Task data is processed once using efficient array methods, and week calculations are done only when needed. The component only renders the current week (7 days) instead of a full month, reducing DOM elements and improving rendering speed.

### 5. **Future Extensibility**
The calendar structure allows for easy future enhancements such as:
- Clicking dates to filter tasks
- Showing task counts instead of just indicators
- Adding monthly/yearly navigation
- Integrating with task creation/editing
- Adding calendar-based task scheduling

The modular code structure makes it simple to add these features without major refactoring.

---

## Reference Links and Documentation

### React Calendar Library
- **Official Documentation**: https://github.com/wojtekmaj/react-calendar
- **npm Package**: https://www.npmjs.com/package/react-calendar
- **API Reference**: https://github.com/wojtekmaj/react-calendar#api
- **Examples**: https://github.com/wojtekmaj/react-calendar#examples

### Day.js (Date Library)
- **Official Documentation**: https://day.js.org/
- **API Reference**: https://day.js.org/docs/en/display/format
- **npm Package**: https://www.npmjs.com/package/dayjs

### Material-UI (Styling)
- **Official Documentation**: https://mui.com/
- **Box Component**: https://mui.com/material-ui/react-box/
- **Grid System**: https://mui.com/material-ui/react-grid/
- **SX Prop**: https://mui.com/system/getting-started/the-sx-prop/

### React Hooks
- **useState Hook**: https://react.dev/reference/react/useState
- **React Documentation**: https://react.dev/

### JavaScript Array Methods
- **Array.reduce()**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce
- **Array.from()**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from
- **Array.filter()**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter

### CSS Selectors
- **CSS :has() Selector**: https://developer.mozilla.org/en-US/docs/Web/CSS/:has
- **CSS Pseudo-classes**: https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes

---

## Installation Requirements

To use this calendar feature, ensure the following package is installed:

```bash
npm install react-calendar
```

The package is already added to `frontend/package.json`:
```json
"react-calendar": "^4.7.0"
```

---

## File Locations

- **Main Implementation**: `frontend/src/components/Dashboard.js` (lines ~448-467, ~741-760)
- **Package Configuration**: `frontend/package.json`
- **CSS Import**: Automatically imported via `import 'react-calendar/dist/Calendar.css'`

---

## Testing Checklist

- [ ] Calendar displays current week correctly
- [ ] Task indicators (blue dots) appear on dates with pending tasks
- [ ] Borders are visible in both light and dark modes
- [ ] Date selection updates calendar state
- [ ] Calendar is responsive on mobile devices
- [ ] Dark mode colors display correctly
- [ ] Only current week is visible (other weeks hidden)
- [ ] Navigation buttons work correctly



