#!/bin/bash

# Define volume names from devcontainer.json
VOLUMES=(
    "man-vs-myopia-app_claude-code-bashhistory"
    "man-vs-myopia-app_claude-code-config"
)

# Function to check if volume exists
check_volume() {
    docker volume ls -q | grep -q "^$1$"
}

# Create volumes if they don't exist
for volume in "${VOLUMES[@]}"; do
    if ! check_volume "$volume"; then
        echo "Creating volume: $volume"
        if docker volume create "$volume"; then
            echo "Successfully created volume: $volume"
        else
            echo "Failed to create volume: $volume"
            exit 1
        fi
    else
        echo "Volume already exists: $volume"
    fi
done

echo "Volume creation completed successfully"
