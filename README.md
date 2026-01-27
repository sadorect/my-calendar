# Personal Productivity Calendar

A modern, responsive calendar application built with Vue.js 3 for personal productivity management. Features intuitive event creation, drag-and-drop rescheduling, and beautiful mobile-first design.

![Personal Calendar](https://img.shields.io/badge/Vue.js-3.4.0-4FC08D?style=flat-square&logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-5.0.0-646CFF?style=flat-square&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.0-38B2AC?style=flat-square&logo=tailwind-css)
![FullCalendar](https://img.shields.io/badge/FullCalendar-6.1.0-3788D8?style=flat-square)

## ✨ Features

### 🎯 Core Functionality

- **Icon-Based Quick Add**: 14 pre-defined event templates with smart defaults
- **Multiple Calendar Views**: Month, Week, Day, List, and Today dashboard
- **Drag-and-Drop Rescheduling**: Intuitive event management across all views
- **Color-Coded Categories**: Visual organization with Material Design colors
- **Mobile-First Design**: Fully responsive with touch-optimized interface

### 📱 Mobile Experience

- **Adaptive Navigation**: Bottom tab bar on mobile, top navigation on desktop
- **Touch-Friendly**: 44px+ touch targets, swipe gestures, optimized spacing
- **Progressive Web App**: Installable, offline-capable, service worker ready
- **Responsive Cards**: Event templates scale beautifully across devices

### 🛠️ Technical Features

- **Offline Storage**: IndexedDB with localForage for data persistence
- **Real-time Updates**: Instant synchronization across all views
- **Modern Stack**: Vue 3 Composition API, Pinia state management, Vite build tool
- **Type-Safe**: ESLint configuration with Vue 3 support
- **Performance**: Optimized bundle size, lazy loading, efficient rendering

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Modern web browser with ES6+ support

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd personal-calendar
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

4. **Open your browser**
   ```
   http://localhost:5173
   ```

### Build for Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📋 Usage Guide

### Adding Events

1. Click the floating **+ button** (bottom-right)
2. Choose from **14 event templates** with pre-filled settings:
   - 💼 Work Meeting (1 hour)
   - 🏋️ Gym/Workout (45 minutes)
   - 🏥 Doctor Appointment (30 minutes, requires location)
   - 🍽️ Meal/Lunch (1 hour)
   - ✈️ Travel (all-day, requires location)
   - 👥 Social Event (2 hours)
   - 📚 Study Session (2 hours)
   - 📝 School Submission (all-day)
   - 🎯 Project Milestone (all-day)
   - 📞 Phone Call (30 minutes)
   - 🎓 Class/Lecture (1 hour, requires location)
   - 🛒 Shopping/Errands (1 hour)
   - 🚗 School Runs (30 minutes, requires location)
   - 📝 Other (1 hour, catch-all category)

3. Customize date, time, duration, location, and notes
4. Click **Save** to add to calendar

### Managing Events

- **Drag & Drop**: Click and drag events to reschedule
- **View Switching**: Use navigation to switch between Month/Week/Day/List/Today
- **Edit Events**: Click on events to view details (edit functionality coming soon)
- **Delete Events**: Right-click or long-press for options (coming soon)

### Sample Data

- Click **"Add Sample Events"** on the Today dashboard to populate with test data
- Perfect for testing drag-and-drop and calendar functionality

## 🏗️ Project Structure

```
personal-calendar/
├── public/                 # Static assets
├── src/
│   ├── components/
│   │   ├── Calendar/       # Calendar view components
│   │   │   ├── MonthView.vue
│   │   │   ├── WeekView.vue
│   │   │   ├── DayView.vue
│   │   │   ├── ListView.vue
│   │   │   └── TodayDashboard.vue
│   │   └── Events/         # Event-related components
│   │       ├── IconTemplates.vue
│   │       └── QuickAddModal.vue
│   ├── stores/             # Pinia state management
│   │   └── events.js
│   ├── services/           # Data persistence layer
│   │   └── database.js
│   ├── App.vue             # Root component
│   └── main.js             # Application entry point
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🛠️ Technology Stack

### Frontend Framework

- **Vue.js 3.4.0** - Progressive JavaScript framework with Composition API
- **Vite 5.0.0** - Fast build tool and development server
- **Pinia 2.1.0** - Intuitive state management for Vue

### UI & Styling

- **Tailwind CSS 3.4.0** - Utility-first CSS framework
- **FullCalendar 6.1.0** - Feature-rich calendar library
- **Material Design Colors** - Consistent color palette

### Data & Storage

- **localForage 1.10.0** - IndexedDB wrapper for client-side storage
- **date-fns 3.0.0** - Modern JavaScript date utility library

### Development Tools

- **ESLint** - Code linting and formatting
- **Prettier** - Code formatting
- **PostCSS** - CSS processing with Autoprefixer

## 📱 Mobile Responsiveness

### Breakpoint Strategy

- **Mobile**: < 768px (sm)
- **Tablet**: 768px - 1024px (md)
- **Desktop**: > 1024px (lg)

### Mobile Optimizations

- **Navigation**: Bottom tab bar with icons vs desktop top navigation
- **Touch Targets**: Minimum 44px touch targets
- **Grid Layouts**: Responsive card grids (2-6 columns based on screen)
- **Modal Sizing**: Full-screen on mobile, constrained on desktop
- **Typography**: Responsive text sizing

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Development
VITE_APP_TITLE="Personal Calendar"
VITE_APP_VERSION="1.0.0"
```

### Tailwind Configuration

Custom colors and responsive breakpoints in `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#1976D2',
        secondary: '#FF6F00'
      }
    }
  }
}
```

## 🧪 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run format       # Format code with Prettier

# Testing
npm test             # Run all e2e tests
npm run test:ui      # Run tests with UI mode
npm run test:headed  # Run tests in headed mode (visible browser)
npm run test:debug   # Run tests in debug mode

# Git hooks (recommended)
npm run precommit    # Run lint and format before commit
```

### Testing

This project uses [Playwright](https://playwright.dev/) for end-to-end testing to ensure all features work correctly across different browsers and devices.

#### Test Coverage

The e2e tests cover:

- ✅ **App Loading**: Verifies the application loads without errors
- ✅ **Navigation**: Tests switching between different calendar views (Today, Month, Week, Day, List, Analytics)
- ✅ **Event Creation**: Tests creating events using templates with form validation
- ✅ **Event Management**: Tests editing, duplicating, and deleting events
- ✅ **Search Functionality**: Tests event search and filtering
- ✅ **Dark Mode**: Tests theme switching functionality
- ✅ **Export/Import**: Tests data export and import features
- ✅ **Mobile Responsiveness**: Tests mobile navigation and touch interactions
- ✅ **Form Validation**: Tests client-side validation for event creation
- ✅ **Calendar Views**: Tests different calendar display modes

#### Running Tests

```bash
# Run all tests (headless)
npm test

# Run tests with browser UI visible
npm run test:ui

# Run specific test file
npx playwright test tests/calendar-e2e.spec.js

# Run tests in debug mode
npm run test:debug

# Run smoke tests only (quick verification)
npx playwright test tests/smoke.spec.js
```

#### Test Configuration

- **Browsers**: Chromium, Firefox, WebKit (Safari)
- **Devices**: Desktop and mobile viewports (iPhone, Android)
- **Parallel Execution**: Tests run in parallel for faster execution
- **Auto-setup**: Development server starts automatically before tests

#### Writing Tests

Tests are located in the `tests/` directory:

- `calendar-e2e.spec.js` - Comprehensive end-to-end tests
- `smoke.spec.js` - Quick smoke tests for basic functionality

Example test structure:

```javascript
test('should create a new event', async ({ page }) => {
  // Navigate and interact with the app
  await page.goto('/')
  await page.click('button:has-text("Add Event")')

  // Fill form and verify
  await page.fill('input[name="title"]', 'Test Event')
  await page.click('button[type="submit"]')

  // Assert result
  await expect(page.locator('text=Test Event')).toBeVisible()
})
```

#### CI/CD Integration

Tests are configured to run in CI environments with:

- Automatic browser installation
- Parallel test execution
- HTML test reports
- Screenshots on failure

### Code Quality

- **ESLint**: Vue 3 + JavaScript best practices
- **Prettier**: Consistent code formatting
- **Git Hooks**: Pre-commit quality checks

### Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🚀 Deployment

### Static Hosting

The app builds to static files perfect for:

- Netlify
- Vercel
- GitHub Pages
- Firebase Hosting

### Build Output

```bash
npm run build
# Output in /dist directory
```

### PWA Features (Future)

- Service Worker for offline functionality
- Web App Manifest for installation
- Background sync for notifications

## 🚀 CI/CD Pipeline

This project uses GitHub Actions for automated testing, building, and deployment.

### Workflows

- **CI/CD** (`ci-cd.yml`): Runs on every push to main and pull requests
  - Code linting with ESLint
  - Code formatting checks with Prettier
  - Unit and E2E tests with Playwright
  - Production build verification
  - Automatic deployment to Vercel

- **Preview Deployments** (`preview.yml`): Runs on pull requests
  - Full test suite
  - Preview deployment to Vercel
  - Automatic PR comments with preview URLs

- **Security & Quality** (`security.yml`): Weekly automated checks
  - Dependency vulnerability scanning
  - Lighthouse performance audits
  - Outdated dependency reports

### Setup Vercel Deployment

1. **Create Vercel Account**: Sign up at [vercel.com](https://vercel.com)

2. **Install Vercel CLI**:

   ```bash
   npm i -g vercel
   ```

3. **Deploy Manually First**:

   ```bash
   vercel --prod
   ```

   Follow the prompts to link your GitHub repository.

4. **Get Vercel Secrets**:

   ```bash
   vercel env pull .env.local
   ```

5. **Add Secrets to GitHub**:
   Go to your repository Settings → Secrets and variables → Actions

   Add these secrets:
   - `VERCEL_TOKEN`: Your Vercel token (get from [vercel.com/account/tokens](https://vercel.com/account/tokens))
   - `VERCEL_ORG_ID`: Your Vercel organization ID
   - `VERCEL_PROJECT_ID`: Your Vercel project ID

6. **Automatic Deployments**: Push to main branch to trigger production deployment

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Run linter
npm run lint

# Format code
npm run format
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow Vue 3 Composition API patterns
- Use TypeScript for new components (future migration)
- Maintain mobile-first responsive design
- Write meaningful commit messages
- Test on multiple devices/browsers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Vue.js](https://vuejs.org/) - The Progressive JavaScript Framework
- [FullCalendar](https://fullcalendar.io/) - The best calendar library
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
- [Material Design](https://material.io/) - Design system inspiration

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/username/personal-calendar/issues)
- **Discussions**: [GitHub Discussions](https://github.com/username/personal-calendar/discussions)
- **Email**: your-email@example.com

---

**Built with ❤️ using Vue.js 3 and modern web technologies**

_Last updated: January 26, 2026_</content>
<parameter name="filePath">/home/casper/Developer/personal-calendar/README.md
