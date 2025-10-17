# TODO: Fix TypeScript Errors in Style Properties

## Tasks
- [ ] Add `withOpacity` utility function to `constants/colors.ts`
- [ ] Update `app/(tabs)/sos.tsx` to import and use `withOpacity` for color opacity
- [ ] Replace `COLORS.primary + '20'` with `withOpacity(COLORS.primary, 0.2)` in styles
- [ ] Run TypeScript check to verify errors are resolved
- [ ] Test the app to ensure styles render correctly
- [ ] Check other open files for similar issues and fix if found
