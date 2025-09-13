# Contributing to Kopy

Thank you for your interest in contributing to Kopy! This document provides guidelines and information for contributors.

## What is Kopy?

Kopy is a private encrypted pastebin that allows users to securely share text with automatic expiration. It features end-to-end encryption, password protection, and a clean, minimal interface.

## How to Contribute

### Reporting Issues

If you find a bug or have a feature request:

1. **Check existing issues** - Make sure the issue hasn't already been reported
2. **Create a new issue** with:
   - Clear, descriptive title
   - Detailed description of the problem/feature
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Screenshots if applicable

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/kopy.git
   cd kopy
   ```

3. **Install dependencies**:
   ```bash
   npm install
   # or
   pnpm install
   ```

4. **Set up environment variables**:
   ```bash
   cp env.template .env.local
   ```
   Then edit `.env.local` with your Supabase credentials.

5. **Set up Supabase database**:
   - Create a new Supabase project
   - Run the SQL from `supabase-schema.sql` in the SQL Editor
   - Get your project URL and anon key

6. **Start the development server**:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

### Making Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** following the coding standards below

3. **Test your changes**:
   - Test the functionality manually
   - Ensure the app builds without errors
   - Check that existing features still work

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   # or
   git commit -m "fix: resolve bug description"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub

## Coding Standards

### Code Style

- **TypeScript**: Use TypeScript for all new code
- **ESLint**: Follow the existing ESLint configuration
- **Prettier**: Code will be formatted automatically
- **Naming**: Use descriptive, camelCase variable names
- **Comments**: Add comments for complex logic

### File Structure

```
kopy/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── view/[id]/         # Dynamic paste view
├── lib/                   # Utility libraries
│   ├── encryption.ts      # Encryption functions
│   └── supabase.ts        # Supabase client
├── supabase-schema.sql    # Database schema
└── README.md             # Project documentation
```

### Component Guidelines

- **Functional Components**: Use React functional components with hooks
- **Props**: Define TypeScript interfaces for component props
- **State**: Use `useState` and `useEffect` appropriately
- **Styling**: Use Tailwind CSS classes
- **Accessibility**: Ensure proper ARIA labels and keyboard navigation

### Security Considerations

- **Encryption**: All content must be encrypted client-side before storage
- **Passwords**: Use secure hashing (SHA-256) for password storage
- **Validation**: Validate all user inputs
- **Environment Variables**: Never commit sensitive credentials

## Pull Request Process

### Before Submitting

1. **Test thoroughly** - Ensure your changes work as expected
2. **Update documentation** - Update README.md if needed
3. **Check for conflicts** - Rebase on latest main branch if needed
4. **Write clear commit messages** - Use conventional commit format

### PR Requirements

- **Clear title** - Describe what the PR does
- **Detailed description** - Explain the changes and why
- **Screenshots** - For UI changes
- **Testing notes** - How to test the changes
- **Breaking changes** - Note any breaking changes

### Review Process

1. **Automated checks** - CI/CD will run tests and linting
2. **Code review** - Maintainers will review the code
3. **Testing** - Changes will be tested in different environments
4. **Approval** - At least one maintainer approval required

## Commit Message Format

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(auth): add password protection for pastes
fix(ui): resolve time display not showing
docs: update setup instructions
```

## Development Guidelines

### Adding New Features

1. **Plan the feature** - Consider security, UX, and performance
2. **Update database schema** if needed
3. **Implement client-side logic**
4. **Add proper error handling**
5. **Update documentation**
6. **Test thoroughly**

### Bug Fixes

1. **Reproduce the bug** - Create a test case
2. **Identify the root cause**
3. **Implement the fix**
4. **Add tests** to prevent regression
5. **Update documentation** if needed

### Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public issue
2. **Email** the maintainers directly
3. **Provide** detailed information about the vulnerability
4. **Wait** for response before public disclosure

## Testing

### Manual Testing

- Test all user flows
- Test with different browsers
- Test responsive design
- Test error scenarios
- Test security features

### Automated Testing

- Unit tests for utility functions
- Integration tests for API endpoints
- E2E tests for critical user flows

## Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Follow the golden rule

### Getting Help

- **GitHub Issues** - For bugs and feature requests
- **Discussions** - For questions and general discussion
- **Documentation** - Check README.md and code comments first

## License

By contributing to Kopy, you agree that your contributions will be licensed under the same license as the project (MIT License).

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation

Thank you for contributing to Kopy! 🚀
