# AppImage Desktop Integration Guide

This guide explains how to integrate the AI PDF Reader AppImage with your Linux desktop environment using AppImageLauncher.

## What is AppImageLauncher?

AppImageLauncher is a helper application that makes it easy to integrate AppImages into your Linux desktop. It automatically handles:
- Moving AppImages to a central location (`~/Applications`)
- Adding applications to your system menu
- Creating desktop shortcuts
- Managing updates and removal

## Installation

### Check if AppImageLauncher is Installed

```bash
which AppImageLauncher || dpkg -l | grep -i appimagelauncher
```

### Installation Methods

#### Option 1: Download from GitHub (Recommended)

1. Download the latest release:
```bash
wget https://github.com/TheAssassin/AppImageLauncher/releases/download/v2.2.0/appimagelauncher_2.2.0-travis995.0f91801.bionic_amd64.deb
```

2. Install the package:
```bash
sudo dpkg -i appimagelauncher_2.2.0-travis995.0f91801.bionic_amd64.deb
```

3. Fix any dependency issues:
```bash
sudo apt-get install -f
```

#### Option 2: Using PPA (Note: Being deprecated as of April 2025)

```bash
sudo add-apt-repository ppa:appimagelauncher-team/stable
sudo apt update
sudo apt install appimagelauncher
```

**Note:** Check the [official releases page](https://github.com/TheAssassin/AppImageLauncher/releases) for the latest version.

## Integrating AI PDF Reader

Once AppImageLauncher is installed:

1. **Navigate to your AppImage**:
   ```bash
   cd /path/to/ai-pdf-reader/build/
   ```

2. **Double-click the AppImage** or run:
   ```bash
   ./AI\ PDF\ Reader-1.0.1.AppImage
   ```

3. **AppImageLauncher Dialog**: You'll see a dialog with two options:
   - **Run once**: Runs the application without integration
   - **Integrate and run**: Integrates the app into your system

4. **Choose "Integrate and run"** to:
   - Move the AppImage to `~/Applications/`
   - Add AI PDF Reader to your application menu
   - Create proper desktop integration with the custom icon
   - Launch the application

## After Integration

Once integrated, you can:
- **Find the app** in your application menu/launcher
- **Pin it** to your dock or taskbar
- **Right-click** the launcher icon for options to:
  - Update the application
  - Remove the application
  - Access application properties
- **Launch it** like any other installed application

## Benefits of Integration

1. **Automatic Updates**: AppImageLauncher can check for and notify you of updates
2. **System Integration**: The app appears in system menus and launchers
3. **Icon Display**: Your custom icon will display properly in all contexts
4. **Central Location**: All AppImages are organized in `~/Applications/`
5. **Easy Removal**: Right-click to remove the app and its integration

## Troubleshooting

### Icons Not Showing
If the icon doesn't appear after integration:
1. Log out and log back in
2. Or restart your desktop environment:
   ```bash
   # For GNOME
   killall -3 gnome-shell
   
   # For KDE
   kquitapp5 plasmashell && kstart5 plasmashell
   ```

### AppImageLauncher Not Working
If AppImageLauncher doesn't appear when double-clicking:
1. Make the AppImage executable:
   ```bash
   chmod +x "AI PDF Reader-1.0.1.AppImage"
   ```
2. Try running from terminal to see any errors
3. Ensure AppImageLauncher service is running

### Manual Integration Alternative
If AppImageLauncher isn't working, you can manually integrate:
1. Copy the AppImage to `~/Applications/`
2. Create a `.desktop` file in `~/.local/share/applications/`
3. Update the desktop database:
   ```bash
   update-desktop-database ~/.local/share/applications/
   ```

## Configuration

Access AppImageLauncher settings through:
- Application menu → AppImageLauncher Settings
- Or run: `AppImageLauncherSettings`

Available settings:
- Integration dialog behavior
- AppImage storage location
- Daemon startup options
- Update check frequency

## Additional Resources

- [AppImageLauncher GitHub](https://github.com/TheAssassin/AppImageLauncher)
- [AppImage Documentation](https://docs.appimage.org/)
- [Desktop Entry Specification](https://specifications.freedesktop.org/desktop-entry-spec/latest/)