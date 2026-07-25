import React from "react";
import { Tractor, Users, LayoutDashboard, Phone, MessageCircle, Facebook, Instagram } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
  <footer className="bg-black/50 backdrop-blur-2xl shadow-xl text-white border-t border-white/20">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Brand Section */}
          <div className="space-y-4">
            <Link to="/home" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-all duration-300">
                <Tractor className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                  TractorTrack
                </h3>
                <p className="text-sm text-gray-400">Smart farming starts here</p>
              </div>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Track tractor sessions, manage farmers, and optimize field operations with our smart dashboard.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5" />
              Quick Links
            </h4>
            <div className="space-y-3">
              <Link to="/home" className="flex items-center gap-3 text-gray-300 hover:text-white hover:translate-x-1 transition-all duration-200 group">
                <div className="w-2 h-2 bg-green-400 rounded-full group-hover:scale-110 transition-transform" />
                Dashboard
              </Link>
              <Link to="/farmers" className="flex items-center gap-3 text-gray-300 hover:text-white hover:translate-x-1 transition-all duration-200 group">
                <div className="w-2 h-2 bg-green-400 rounded-full group-hover:scale-110 transition-transform" />
                Farmers
              </Link>
              <Link to="/sessions" className="flex items-center gap-3 text-gray-300 hover:text-white hover:translate-x-1 transition-all duration-200 group">
                <div className="w-2 h-2 bg-green-400 rounded-full group-hover:scale-110 transition-transform" />
                Sessions
              </Link>
              <Link to="/reports" className="flex items-center gap-3 text-gray-300 hover:text-white hover:translate-x-1 transition-all duration-200 group">
                <div className="w-2 h-2 bg-green-400 rounded-full group-hover:scale-110 transition-transform" />
                Reports
              </Link>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Contact
            </h4>
            <div className="space-y-4">
              <a href="tel:+919876543210" className="flex items-center gap-3 text-gray-300 hover:text-white hover:translate-x-1 transition-all duration-200 group">
                <Phone className="w-5 h-5 text-green-400" />
                +91 98765 43210
              </a>
              <a href="https://wa.me/919876543210" className="flex items-center gap-3 text-gray-300 hover:text-white hover:translate-x-1 transition-all duration-200 group">
                <MessageCircle className="w-5 h-5 text-green-400" />
                WhatsApp Support
              </a>
              <p className="text-gray-400 text-sm">Haldia, West Bengal</p>
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Stay Updated</h4>
            <p className="text-gray-400 text-sm mb-4">Get farming tips and tractor maintenance alerts</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
              <button className="px-6 md:flex py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200 whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 mt-12 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-sm text-gray-400">
              © {currentYear} TractorTrack. All rights reserved. Built for farmers 🚜
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-all duration-200">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-all duration-200">
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
