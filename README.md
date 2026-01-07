# Job Hunt Assistant

A Next.js application designed to assist with job hunting.

## Getting Started

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Development Commands

We have set up several scripts to ensure code quality:

- **Format Code**: `npm run format` (uses Prettier)
- **Lint Code**: `npm run lint` (uses ESLint)
- **Type Check**: `npm run type-check` (uses TypeScript)
- **Run Tests**: `npm test` (uses Jest)
- **Watch Tests**: `npm run test:watch`

### Check Everything

To run all quality checks at once (Formatting, Linting, Type Checking, and Testing):

```bash
# Make executable first: chmod +x verify.sh
./verify.sh
```

## Docker Support

We provide full Docker support for containerized deployment.

```bash
# Build and run the container
docker compose up --build
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Continuous Integration & Ops

- **GitHub Actions**: A CI pipeline is configured in `.github/workflows/ci.yml` that runs on every push and pull request to `main`. It confirms that the code builds, lints, and passes tests.
- **Pre-commit Hooks**: Husky and lint-staged are configured to automatically format and lint staged files before committing, as well as run type checks.

## Tech Stack

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Jest](https://jestjs.io/) & [React Testing Library](https://testing-library.com/)
- [Prettier](https://prettier.io/) & [ESLint](https://eslint.org/)

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
