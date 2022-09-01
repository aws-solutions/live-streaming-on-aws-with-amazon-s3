# 1. Create a `main.tf` file in the root of this repository with the `remote` backend and one or more resources defined.
#   Example `main.tf`:
#     # The configuration for the `remote` backend.
     terraform {
     backend "remote" {

        organization = "PremierXS"

        workspaces {
          name = "PremierXS-Workspace"
       }
      }
    }