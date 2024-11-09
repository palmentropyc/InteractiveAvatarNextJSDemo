"use client";

import {
  Link,
  Navbar,
  NavbarBrand,
  NavbarContent,
} from "@nextui-org/react";
import { ThemeSwitch } from "./ThemeSwitch";

export default function NavBar() {
  return (
    <Navbar className="bg-white/80 backdrop-blur-sm border-b border-gray-100">
      <NavbarBrand>
        <div>
          <p className="text-xl font-bold text-gray-800">
            Hawkings Tutor
          </p>
        </div>
      </NavbarBrand>
      <NavbarContent justify="end">
        <ThemeSwitch />
      </NavbarContent>
    </Navbar>
  );
}
