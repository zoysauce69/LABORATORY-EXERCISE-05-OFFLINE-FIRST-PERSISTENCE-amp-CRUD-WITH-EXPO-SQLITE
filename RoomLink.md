# RoomLink — Complete Frontend App Development

Build a complete, modern, fully functional frontend application called **RoomLink**, based on my Figma design: https://www.figma.com/design/7s8rVBO4PQ6bei4ONEJ7gP/RoomLink?node-id=0-1

## Instructions
First, inspect the existing project files and study the Figma design. Follow the original layout, colors, typography, spacing, cards, buttons, and overall visual style as closely as possible. If some screens or features are missing, use your own design judgment to create polished, consistent additions.

## Technology
- Use React with Vite and TypeScript if the project is a web app.
- Use Tailwind CSS for styling if compatible with the existing project.
- Use Lucide icons.
- Use reusable components and clean, organized code.
- Preserve the existing framework if the project is already configured.

## Required Features

Create a complete roommate-finding and accommodation frontend with these screens:

1. **Landing Page** — Hero section, search bar, featured rooms, roommate listings, benefits, how it works, testimonials, and footer.
2. **Authentication UI** — Sign-in, sign-up, forgot password, and form validation. Use simulated authentication without a backend.
3. **Dashboard** — Personalized welcome message, recommended rooms, recent activity, saved listings, and application status.
4. **Find Rooms** — Searchable room listings with location, price, room type, amenities, availability, and filters.
5. **Room Details** — Room photos, rent, location, description, amenities, house rules, roommate information, and booking/application buttons.
6. **Find Roommates** — Roommate profile cards showing names, photos, budgets, preferred locations, interests, lifestyle preferences, and short biographies.
7. **Roommate Profile** — Detailed profile with contact or request options and compatibility information.
8. **Booking and Applications** — Working forms for booking a room, requesting a roommate, and submitting an application. Display confirmation messages after successful submission.
9. **Messages** — Functional mock conversations with predefined roommates. Allow users to send messages and see them appear immediately.
10. **Favorites** — Save and remove rooms and roommate profiles.
11. **My Applications** — View submitted applications and simulated statuses such as Pending, Approved, and Rejected.
12. **User Profile** — Editable name, profile photo, contact details, budget, preferred location, interests, and roommate preferences.
13. **Settings** — Edit profile, notification preferences, theme preferences if supported, and sign-out.
14. **Notifications** — Display simulated booking updates, application updates, and roommate requests.
15. **Help and Support** — FAQ section and a simple contact form.

## No Database or Backend

Do not create or connect any database, API, backend server, Firebase, Supabase, or external authentication service.

Populate the application with realistic sample data, placeholder images, and predefined roommate profiles and room listings.

Use localStorage for demo persistence where appropriate, so favorites, profile edits, mock messages, bookings, and applications remain available after refreshing the browser. Keep all functionality frontend-only.

Provide a convenient demo account or simulated sign-in flow so I can explore every feature without requiring real credentials.

## Functional Requirements

Every visible interactive element must work.

- Search rooms and roommates by keyword or location.
- Filter and sort listings by rent, location, availability, and amenities.
- Open room details from listing cards.
- Add and remove favorites.
- Submit booking and roommate requests.
- Show clear success messages after submissions.
- Update application statuses using demo data.
- Edit and save user profile information.
- Send and display mock messages.
- Navigate between all pages without broken links.
- Make dropdowns, tabs, modals, filters, forms, and buttons functional.
- Implement sign-in, sign-out, and route protection using simulated frontend authentication.
- Signing out must return the user to the landing page.
- The profile and settings pages must display the currently signed-in demo user's information.
- Include loading indicators, empty states, error messages, and confirmation dialogs where appropriate.

## UI and Design Improvements

Keep the Figma design as the primary visual reference. Do not replace it with a generic template.

If the design is incomplete, improve it by adding missing sections, consistent spacing, subtle shadows, rounded cards, polished forms, clear typography, useful empty states, and smooth transitions.

Use realistic sample content instead of generic placeholder text. Maintain a consistent design system throughout the application.

Make the app responsive on desktop, tablet, and mobile. On desktop, use a clean navigation bar and sidebar where appropriate. On mobile, use compact navigation, stacked cards, and touch-friendly controls.

Use suitable room and interior photographs from reliable image URLs or available local assets. Ensure image fallbacks are provided.

## Code Quality

- Use reusable components and maintainable folder structures.
- Keep UI components, pages, mock data, and utility functions organized.
- Use proper TypeScript types.
- Avoid duplicated code and unnecessary dependencies.
- Ensure forms have validation and accessible labels.
- Do not leave buttons as decorative elements.
- Do not use pseudocode or unfinished placeholder implementations.
- Do not rewrite unrelated files unnecessarily.

## Execution Instructions

1. Inspect the project and its existing dependencies.
2. Review the Figma design and identify its visual style and page structure.
3. Plan the required screens and reusable components.
4. Implement the entire application, including navigation and frontend interactions.
5. Install any necessary dependencies.
6. Run the development server and resolve compilation errors.
7. Test the main user flows, including sign-in, searching, favoriting, booking, applications, messaging, profile editing, and sign-out.
8. Fix broken layouts, nonfunctional controls, console errors, and responsive issues.
9. Provide the exact command to run the finished application.

**Important:** Do not stop after creating a landing page or a static prototype. Build the complete frontend with functional interactions and consistent design across all screens. Make sensible decisions without repeatedly asking me questions. If the Figma link cannot be accessed directly, inspect any available project assets and ask me to provide screenshots of the design rather than inventing its exact appearance.

Start by inspecting the current project, then implement the application in the working directory.