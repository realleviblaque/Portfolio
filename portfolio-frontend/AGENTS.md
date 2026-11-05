# AGENTS.md — Levi Blaque Portfolio

## 1. Project Overview

Build a premium, modern, responsive personal portfolio website for Levi Blaque.

The website represents an independent personal brand and professional identity. It must feel distinctive, sophisticated, creative, and technically refined.

The application consists of two main areas:

1. Public Portfolio Website
2. Private Admin Dashboard

The project owner is responsible for developing the backend separately. Your responsibility is the frontend only.

## 2. Technology Stack

Use the following technologies:

- React for the frontend.
- Vite for the development environment and build tooling.
- JavaScript (ES6+).
- React Router for navigation.
- CSS for styling, with a maintainable global and component-level structure.
- Lucide React for icons where appropriate.

Do not introduce Next.js, Express, Django, databases, or backend frameworks.

Do not install additional dependencies without explaining why they are needed.

## 3. Development Principles

- Write clean, readable, maintainable code.
- Build reusable React components.
- Avoid unnecessarily complicated implementations.
- Use functional components and React hooks.
- Keep components focused on individual responsibilities.
- Separate UI, application logic, data handling, and styling.
- Use semantic HTML and accessible interactions.
- Ensure responsive behaviour across desktop, tablet, and mobile.
- Avoid duplicated code.
- Do not break existing functionality when implementing new features.

Explain important implementation decisions in beginner-friendly language.

## 4. Design Direction and Brand Identity

The portfolio must have a distinctive visual identity separate from generic portfolio templates and SaaS dashboards.

Design characteristics:

- Premium editorial aesthetic.
- Strong typography and visual hierarchy.
- Thoughtful whitespace.
- Modern, sophisticated layouts.
- Subtle transitions and animations.
- Restrained use of accent colours.
- Creative but professional presentation.
- Strong visual presentation of actual projects.

Avoid:

- Generic portfolio templates.
- Excessive gradients and glowing effects.
- Excessive rounded cards.
- Unnecessary glassmorphism.
- Repetitive layouts.
- Generic AI-generated illustrations.
- Cluttered interfaces.

The design must feel intentionally crafted rather than automatically assembled from generic UI components.

## 5. Theme System

Provide three theme options:

- Light
- Dark
- System

Light and dark themes must have their own carefully designed visual treatments.

Light mode should use warm, clean, professional surfaces and readable typography.

Dark mode should use sophisticated charcoal, graphite, muted neutral colours, and carefully selected accents.

Do not simply invert colours between themes.

Remember the user's selected theme between visits using localStorage.

## 6. Public Website Pages

Implement the following pages:

### Homepage
- Hero section.
- Introduction.
- Featured projects.
- About Me preview.
- Contact section.
- Footer.
- View All Projects navigation.

Display a maximum of six featured projects.

Use a three-column desktop layout, two-column tablet layout, and one-column mobile layout where appropriate.

When no projects exist, display exactly:

"No Project Added by Levi Blaque"

Do not create fake projects or placeholder project cards.

### About Me
- Personal introduction.
- Full biography.
- Background and journey.
- Skills.
- Technologies.
- Interests.
- Current activities.
- Achievements, only when supplied by the owner.

Do not invent personal information.

### All Projects
- Project search.
- Category filters.
- Status filters.
- Sorting options.
- Responsive project grid.
- Empty state.

Search should support project titles and descriptions.

Project statuses:

- Ongoing
- Completed
- Paused

Sorting:

- Newest
- Oldest
- Recently Updated

### Project Details
Each project should support:

- Project title.
- Short description.
- Category.
- Status.
- Cover image.
- Project timeline.
- Full project description.
- Image gallery.
- Technologies used.
- Live website link, if available.
- Repository link, if available.
- Contact call-to-action.

Support image gallery viewing and lightbox interactions.

### Contact
Provide a contact form containing:

- Name.
- Email.
- Subject.
- Message.

Include validation, loading, success, and error states.

Do not claim an enquiry has been sent unless the relevant submission operation succeeds.

## 7. Admin Dashboard

Create a private administrative interface with:

- Dashboard Overview.
- Projects.
- Add Project.
- Edit Project.
- Contact Requests.
- About Me Editor.
- Settings.
- Logout.

The dashboard must use a consistent visual identity with the public portfolio while remaining functional and easy to navigate.

### Dashboard Overview

Display:

- Total projects.
- Published projects.
- Ongoing projects.
- Completed projects.
- Paused projects.
- Unread enquiries.
- Recent projects.
- Recent contact requests.
- Quick actions.

Support appropriate zero-data states.

### Project Management

Support:

- Creating projects.
- Editing projects.
- Deleting projects with confirmation.
- Saving drafts.
- Publishing projects.
- Updating published projects.

Project fields:

- Project name.
- Short description.
- Category.
- Start date.
- Optional end date.
- Progress status.
- Publication status.
- Live website URL.
- Repository URL.
- Cover image.
- Full project description.
- Gallery images.
- Optional image captions.

Keep project progress status separate from publication status.

Publication status:

- Draft
- Published

Progress status:

- Ongoing
- Completed
- Paused

The gallery builder should support adding multiple image upload blocks, previews, optional captions, and image removal.

The cover image must remain separate from gallery images.

## 8. Contact Requests Management

Provide:

- All enquiries.
- Unread.
- Read.
- Replied.
- Archived.

Allow the administrator to:

- View full messages.
- Mark enquiries as read.
- Mark enquiries as replied.
- Archive enquiries.
- Delete enquiries with confirmation.

## 9. About Me Editor

Provide editable fields for:

- Personal introduction.
- Full biography.
- Profile image.
- Skills.
- Technologies.
- Interests.
- Social links.
- Contact details.

Include a preview and save interface.

## 10. Settings

Provide settings for:

- Portfolio identity.
- Contact email.
- Social links.
- SEO metadata.
- Theme preferences.
- Footer information.

## 11. Frontend and Backend Separation

This project is frontend-only.

The owner will independently develop the backend.

Therefore:

- Do not create backend servers.
- Do not create database connections.
- Do not implement backend authentication.
- Do not invent API endpoints.
- Do not assume a specific backend framework.
- Do not hardcode backend response structures without approval.

Create a dedicated API/service layer that can later connect to the owner's backend.

Use mock data only when necessary for frontend development, and clearly identify it as mock data.

Keep data operations separate from UI components.

Make it easy to replace mock data with actual API responses later.

## 12. Authentication Interface

Create the admin login interface and protected-route frontend structure.

However, do not implement fake security or claim frontend route protection is sufficient authentication.

The actual authentication system will be implemented and secured by the owner through the backend.

## 13. Project Organization

Keep the application organized into logical folders.

Suggested structure:

- src/
  - assets/
  - components/
  - layouts/
  - pages/
  - routes/
  - hooks/
  - services/
  - context/
  - data/
  - styles/
  - utils/

You may recommend adjustments where they improve maintainability, but explain them first.

## 14. Responsive Design

Support:

- Desktop.
- Tablet.
- Mobile.

Do not simply shrink desktop layouts.

Use appropriate navigation, spacing, typography, and component behaviour for each screen size.

Ensure forms, galleries, tables, navigation, and dashboard layouts remain usable on smaller screens.

## 15. Code Quality and Testing

After each meaningful implementation stage:

- Check for errors.
- Run the production build.
- Test relevant interactions.
- Check responsive layouts.
- Fix errors introduced by your changes.
- Explain what was implemented.
- List files created or modified.
- Explain how to test the implementation.

Do not claim functionality works without testing it.

## 16. Working With the Project Owner

The owner is learning full-stack development.

Act as a collaborative coding partner and technical guide.

Follow this workflow:

1. Understand the requested task.
2. Explain the implementation approach.
3. Identify affected files.
4. Implement only the approved scope.
5. Explain important code decisions.
6. Test the implementation.
7. Summarize completed work.
8. Wait for approval before moving to the next major phase.

Do not independently jump ahead to later development phases.

Do not rewrite unrelated files without a clear reason.

Do not make major architectural decisions without explaining their consequences.

## 17. Initial Development Instruction

At the beginning of development, inspect the repository and this instruction file.

Do not immediately build the entire application.

First propose:

- Application architecture.
- Folder structure.
- Required dependencies.
- Page and component organization.
- Development phases.
- Testing strategy.

Wait for the project owner's approval before implementing the first major feature.

---

**Project Identity:** Levi Blaque

**Application:** Personal Portfolio Website

**Frontend:** React + Vite

**Backend:** Developed separately by the project owner

**Coding Agent:** OpenAI Codex