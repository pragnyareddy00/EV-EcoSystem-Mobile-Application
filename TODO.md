# TODO: Fix Routing Issues in routing.tsx

## Issues Identified
1. **Green routes appearing as polylines**: Investigate why green polylines are rendering alongside the blue route polyline.
2. **Starting point arrow flickering**: Add heading smoothing to reduce rapid rotations from location updates.
3. **EV station marker cut in half**: Adjust map padding or marker positioning to prevent clipping at the bottom edge.

## Tasks
- [ ] Investigate NavigationService for multiple routes or green polylines
- [ ] Add heading smoothing logic to reduce arrow flickering
- [ ] Modify fitToCoordinates padding to ensure markers are fully visible
- [ ] Test changes on device/simulator to verify fixes
