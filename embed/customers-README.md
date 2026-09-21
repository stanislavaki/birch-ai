# Webflow customers block

1. Keep the existing `bento-block u-bg-white cc-customers` block and its “Our customers” heading. This preserves the exact current heading typography and padding.
2. Delete the old logo content inside that block.
3. Insert a Code Embed below the heading and paste all of `customers-embed.html` into it. Give the Embed element 100% width if its parent uses flex.
4. Preview or publish to run the carousel script. The embed sets this bento's background to #2A2A2A (`--color-bg-grey`) and text to white, and removes the fixed aspect ratio so mobile content fits.

Desktop: all seven logos use the exact relative x/y coordinates, widths, and optical vertical offsets from Figma's 1164 x 61 logo frame. Mobile (767 CSS pixels and below): continuous right-to-left loop, 48 seconds per cycle, with design-token-sized opacity fades at both edges so logos are never hard-cropped. Change `48s` to adjust speed (higher = slower). Focus or hover pauses movement. Reduced motion uses a manually scrollable row.

All SVGs are included in the code; no upload or remote image dependencies. Original Figma exports are in `images/customers/`. SVG path precision is reduced to two decimal places for the single-embed size budget; source files are untouched.

Preview: `debug/customers-preview.html`. The preview uses the design system’s `.t-h3` typography, `--radius-lg`, and card/spacing tokens; installation retains your actual Webflow heading and outer padding. The embed reads the design-system color and spacing variables, with matching fallbacks when those variables are unavailable in Webflow. Desktop embed spacing uses the project’s 0.9 rem multiplier; mobile uses 1.0.
