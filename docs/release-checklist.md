# Release Checklist

Manual vibe check before releasing a new version of llmd.

## Pre-Release Testing

### Basic Functionality
- [ ] **Build succeeds**: `bun run build` completes without errors
- [ ] **All tests pass**: `bun test` shows all green
- [ ] **Lint check passes**: `bun run check` shows no critical errors

### Core Features
- [ ] **Start server**: `bun index.ts` starts without errors
- [ ] **View markdown**: Open a markdown file in browser, renders correctly
- [ ] **Sidebar navigation**: Click through files, all load properly
- [ ] **Table of contents**: TOC generates and links work
- [ ] **Code highlighting**: Code blocks have syntax highlighting
- [ ] **Copy buttons**: Code copy buttons work
- [ ] **Theme switching**: Try `--theme nord`, `--theme light`, etc.
- [ ] **Theme persistence**: Theme choice persists across restarts

### Advanced Features
- [ ] **Watch mode**: `--watch` flag reloads on file changes
- [ ] **Analytics page**: `/analytics` loads and shows data
- [ ] **Highlights**: Create a highlight, verify it persists
- [ ] **Highlight notes**: Add notes to a highlight
- [ ] **Export highlights**: `llmd export` generates markdown file

### Documentation
- [ ] **View docs**: `llmd docs` clones/opens project docs
- [ ] **README accuracy**: README examples match current behavior
- [ ] **Help text**: `llmd --help` shows correct flags and descriptions
- [ ] **Docs completeness**: All features mentioned in docs actually work

### Edge Cases
- [ ] **Empty directory**: Run llmd in a directory with no markdown files
- [ ] **Large directory**: Test with 100+ markdown files
- [ ] **Deeply nested**: Test with markdown files 5+ levels deep
- [ ] **Special characters**: Test with filenames containing spaces, unicode
- [ ] **Invalid theme**: `--theme nonexistent` shows helpful error message
- [ ] **Port conflict**: Try to start on already-used port

### Theme Testing
- [ ] **Test all themes**: Try each built-in theme with `--theme` flag
- [ ] **Custom themes**: Test loading custom themes from themes.json
- [ ] **Theme switching**: Verify theme toggle works in browser UI

## Version Management

- [ ] **package.json version**: Updated to new version number
- [ ] **CHANGELOG**: Updated with new features, fixes, breaking changes
- [ ] **Git tag**: Ready to create git tag matching version

## Release Readiness

- [ ] **All commits pushed**: No uncommitted changes
- [ ] **Branch ready**: On main/release branch (not feature branch)
- [ ] **Breaking changes documented**: If any, clearly called out
- [ ] **Migration path clear**: If breaking changes, users know how to upgrade

## Distribution

- [ ] **NPM package**: Ready to run `npm publish`
- [ ] **GitHub release**: Ready to create release with notes
- [ ] **Binary size**: Check `dist/llmd` size is reasonable

## Final Vibe Check

- [ ] **Use it yourself**: Actually use llmd for 5 minutes on real docs
- [ ] **No weird feelings**: If something feels off, investigate it
- [ ] **Fresh perspective**: Start from scratch in a new terminal
- [ ] **Pride check**: Would you be happy for users to see this?

## Post-Release

- [ ] **Test install**: `npm install -g llmd@latest` works
- [ ] **GitHub release**: Created with release notes
- [ ] **Docs site**: If applicable, update any hosted documentation
- [ ] **Announce**: Share release notes where appropriate

---

**Remember:** It's better to delay a release than to ship something broken. Trust your instincts!
