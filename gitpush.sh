#!/bin/bash

    # Prompt for commit message
    #read -p "Enter commit message: " commit_message

    # Add all changes
    git add .

    # Commit with the provided message
    git commit -m "fix"

    # Push to the remote repository (assuming 'origin' and 'main' branch)
    # Adjust 'main' to your branch name if different (e.g., 'master')
    git push -u origin main