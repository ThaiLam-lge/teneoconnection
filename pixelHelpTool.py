# This program helps the user measure the pixel distance between two points on an image or screenshot.
# Usage: python pixelHelpTool.py <imagePath>
# If imagePath is not provided, the program will capture a screenshot and display it.
# If imagePath is provided, the program will display that image.
# The user is prompted to left-click the first point, then the second point.
# The program calculates the X and Y pixel distances between the two points and draws a rectangle between them, displaying the image and the distances.
# Pressing the ESC key will clear the drawings and return to waiting for mouse clicks.
# Pressing the Q key will exit the program.
# When the user moves the mouse over the image, the current mouse coordinates are displayed.

import sys
import cv2
import numpy as np
import pyautogui

# Initialize global variables to store the two points
points = []
image = None
clone = None
window_name = 'Pixel Distance Helper'
distance_text = ''

def print_help():
    """Print usage instructions."""
    print("Usage: python pixelHelpTool.py <imagePath>")
    print("If imagePath is not provided, a screenshot will be taken.")
    print("Left-click to select two points on the image.")
    print("Press ESC to clear the image and continue selecting points.")
    print("Press Q to exit the program.")

def take_screenshot():
    """Capture a screenshot of the screen and return as a numpy array (BGR)."""
    screenshot = pyautogui.screenshot()
    screenshot = cv2.cvtColor(np.array(screenshot), cv2.COLOR_RGB2BGR)
    return screenshot


def draw_rectangle_and_distance(img, pt1, pt2):
    """Draw a rectangle between two points and display the X and Y distances in bold red font."""
    # Draw rectangle
    cv2.rectangle(img, pt1, pt2, (0, 255, 0), 2)
    # Draw circles at the points
    cv2.circle(img, pt1, 5, (0, 0, 255), -1)
    cv2.circle(img, pt2, 5, (255, 0, 0), -1)
    # Calculate X and Y distances
    dx = abs(pt2[0] - pt1[0])
    dy = abs(pt2[1] - pt1[1])
    # Put X and Y distance text in bold red font
    mid_point = ((pt1[0] + pt2[0]) // 2, (pt1[1] + pt2[1]) // 2)
    font = cv2.FONT_HERSHEY_SIMPLEX
    thickness = 3
    color = (0, 0, 255)  # Red
    cv2.putText(img, f"X: {dx}px", (mid_point[0] + 10, mid_point[1]), font, 0.8, color, thickness, cv2.LINE_AA)
    cv2.putText(img, f"Y: {dy}px", (mid_point[0] + 10, mid_point[1] + 35), font, 0.8, color, thickness, cv2.LINE_AA)
    return dx, dy


def mouse_callback(event, x, y, flags, param):
    """Handle mouse events for selecting points and showing coordinates."""
    global points, image, clone, distance_text
    temp_img = image.copy()
    # Show mouse coordinates when moving
    if event == cv2.EVENT_MOUSEMOVE:
        # Draw coordinates near the cursor in bold red font
        font = cv2.FONT_HERSHEY_SIMPLEX
        thickness = 3
        color = (0, 0, 255)
        cv2.putText(temp_img, f"({x}, {y})", (x + 10, y - 10), font, 0.7, color, thickness, cv2.LINE_AA)
        if len(points) == 2:
            # Redraw rectangle and distances if already selected
            draw_rectangle_and_distance(temp_img, points[0], points[1])
        cv2.imshow(window_name, temp_img)
    elif event == cv2.EVENT_LBUTTONDOWN:
        # Left mouse button click
        if len(points) < 2:
            points.append((x, y))
            cv2.circle(image, (x, y), 5, (0, 0, 255) if len(points) == 1 else (255, 0, 0), -1)
            cv2.imshow(window_name, image)
        if len(points) == 2:
            # Draw rectangle and show X, Y distances
            dx, dy = draw_rectangle_and_distance(image, points[0], points[1])
            distance_text = f"X: {dx} pixels, Y: {dy} pixels"
            cv2.imshow(window_name, image)


def main():
    global image, clone, points, distance_text
    print_help()
    # Parse command line arguments
    if len(sys.argv) > 1:
        # Load image from provided path
        image_path = sys.argv[1]
        image = cv2.imread(image_path)
        if image is None:
            print(f"Error: Could not load image from {image_path}")
            sys.exit(1)
    else:
        # Take screenshot
        image = take_screenshot()
    clone = image.copy()
    cv2.namedWindow(window_name)
    cv2.setMouseCallback(window_name, mouse_callback)

    while True:
        # If no mouse movement, show the current image
        display_img = image.copy()
        # Draw the distance text at the bottom left in bold red font
        if distance_text:
            font = cv2.FONT_HERSHEY_SIMPLEX
            thickness = 3
            color = (0, 0, 255)
            text_size, _ = cv2.getTextSize(distance_text, font, 0.9, thickness)
            text_x = 10
            text_y = display_img.shape[0] - 20
            cv2.putText(display_img, distance_text, (text_x, text_y), font, 0.9, color, thickness, cv2.LINE_AA)
        cv2.imshow(window_name, display_img)
        key = cv2.waitKey(20) & 0xFF
        if key == 27:  # ESC key
            # Clear points and drawings, reset image
            image = clone.copy()
            points = []
            distance_text = ''
            cv2.imshow(window_name, image)
        elif key == ord('q') or key == ord('Q'):
            # Quit the program
            break
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()

