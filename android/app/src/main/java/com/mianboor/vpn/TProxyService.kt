package com.mianboor.vpn

/**
 * JNI bridge to libhev-socks5-tunnel.
 *
 * The native library is built by CI with:
 *   -DPKGNAME=com/mianboor/vpn -DCLSNAME=TProxyService
 * so it binds exactly to this class.
 */
object TProxyService {

    init {
        System.loadLibrary("hev-socks5-tunnel")
    }

    private external fun TProxyStartService(configPath: String, fd: Int): Boolean
    private external fun TProxyStopService(): Boolean
    private external fun TProxyIsRunning(): Boolean
    private external fun TProxyGetStats(): LongArray

    fun start(configPath: String, tunFd: Int): Boolean = try {
        TProxyStartService(configPath, tunFd)
    } catch (t: Throwable) {
        false
    }

    fun stop(): Boolean = try {
        TProxyStopService()
    } catch (t: Throwable) {
        false
    }

    fun isRunning(): Boolean = try {
        TProxyIsRunning()
    } catch (t: Throwable) {
        false
    }

    /** Returns [txPackets, txBytes, rxPackets, rxBytes]. */
    fun stats(): LongArray = try {
        TProxyGetStats()
    } catch (t: Throwable) {
        longArrayOf(0L, 0L, 0L, 0L)
    }
}
