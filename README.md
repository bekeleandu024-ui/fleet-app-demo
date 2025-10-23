# Fleet App Demo

A small Next.js application used to explore fleet operations workflows. It relies on a local SQLite
instance managed through Prisma.

## Prerequisites

- Node.js 18 or newer
- npm (bundled with Node.js)

## Getting started

1. Copy the example environment file and set up the Prisma database url if you need a custom
   location:

   ```bash
   cp .env.example .env.local
   ```

   The default value in the example file points Prisma at `prisma/dev.db` inside this repository.

2. Install dependencies:

   ```bash
   npm install
   ```

3. Apply the database migrations and load the demo seed data:

   ```bash
   npm run seed
   ```

   The `preseed` script automatically runs the pending Prisma migrations before executing the seeding
   routine. You can run the same migration step on its own with `npm run prisma:migrate`.

4. Start the development server:

   ```bash
   npm run dev
   ```

   The dev and production start commands now run the migration step automatically, which prevents
   `PrismaClientKnownRequestError` messages such as `The table main.RateSetting does not exist` when
   new tables are added.

Open [http://localhost:3000](http://localhost:3000) to explore the app once the server is running.

## Scripts

- `npm run prisma:migrate` – apply the latest Prisma migrations to the configured database
- `npm run seed` – apply migrations and seed the database with demo data
- `npm run dev` – run the Next.js development server (migrations are applied first)
- `npm run build` – build the production bundle
- `npm run start` – start the production server (migrations are applied first)
- `npm run lint` – run the project lint checks
