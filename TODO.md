# TODO List for Fixing AdminScreen Role Check and setState Error

## Tasks
- [x] Move role check from render to useEffect in AdminScreen to prevent setState during render
- [x] Add useEffect to redirect non-admin users away from admin page
- [x] Test that admin users can access the page and non-admins are redirected
